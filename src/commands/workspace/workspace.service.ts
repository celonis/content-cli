import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as FormData from "form-data";
import AdmZip = require("adm-zip");
import { Context } from "../../core/command/cli-context";
import { fileService } from "../../core/utils/file-service";
import { GracefulError, logger } from "../../core/utils/logger";
import { WorkspaceApi } from "./workspace-api";

interface WorkspaceFile {
    nodeKey: string;
    basePath: string;
    currentPath: string;
    digest: string;
}

interface WorkspaceIndex {
    version: number;
    packageKey: string;
    files: WorkspaceFile[];
}

export interface WorkspaceChange {
    path: string;
    status: "deleted" | "modified" | "moved" | "moved, modified";
}

export class WorkspaceService {
    private readonly api: WorkspaceApi;

    constructor(context: Context) {
        this.api = new WorkspaceApi(context);
    }

    public async checkout(packageKey: string, directory?: string): Promise<void> {
        const target = path.resolve(process.cwd(), directory || packageKey);
        if (fs.existsSync(target)) {
            throw new GracefulError(`Destination already exists: ${target}`);
        }
        const archive = await this.api.checkout(packageKey);
        const zip = new AdmZip(archive);
        if (!zip.getEntry(".pacman/index.json")) {
            throw new GracefulError("Archive does not contain .pacman/index.json");
        }
        const temporary = fileService.extractZipBufferToTempDirectory(archive);
        const parent = path.dirname(target);
        let staging: string | undefined;
        try {
            fs.mkdirSync(parent, { recursive: true });
            staging = fs.mkdtempSync(path.join(parent, ".pacman-checkout-"));
            fs.rmSync(staging, { recursive: true });
            fs.cpSync(temporary, staging, { recursive: true, force: false, errorOnExist: true });
            if (fs.existsSync(target)) {
                throw new GracefulError(`Destination already exists: ${target}`);
            }
            fs.renameSync(staging, target);
        } catch (error) {
            if (staging) {
                fs.rmSync(staging, { recursive: true, force: true });
            }
            throw error;
        } finally {
            fs.rmSync(temporary, { recursive: true, force: true });
        }
        logger.info(`Checked out ${packageKey} to ${target}`);
    }

    public status(directory?: string): WorkspaceChange[] {
        const root = this.root(directory);
        const index = this.index(root);
        const changes = index.files.flatMap(file => {
            const absolutePath = this.resolveVisiblePath(root, file.currentPath);
            if (!fs.existsSync(absolutePath)) {
                return [{ path: file.currentPath, status: "deleted" as const }];
            }
            const moved = file.basePath !== file.currentPath;
            const modified = this.digest(absolutePath) !== file.digest;
            if (!moved && !modified) {
                return [];
            }
            let status: WorkspaceChange["status"] = "modified";
            if (moved) {
                status = modified ? "moved, modified" : "moved";
            }
            return [{ path: file.currentPath, status } as WorkspaceChange];
        });
        if (changes.length === 0) {
            logger.info("Workspace is clean.");
        } else {
            changes.forEach(change => logger.info(`${change.status}: ${change.path}`));
        }
        return changes;
    }

    public async push(directory?: string, overwrite: boolean = false): Promise<void> {
        const root = this.root(directory);
        const index = this.index(root);
        index.files.forEach(file => {
            if (!fs.existsSync(this.resolveVisiblePath(root, file.currentPath))) {
                throw new GracefulError(`Tracked file is missing: ${file.currentPath}`);
            }
        });
        const zipPath = fileService.zipDirectoryAsSinglePackage(root);
        try {
            const pushedIndex = this.pushedIndex(index, zipPath);
            const form = new FormData();
            form.append("packageFile", fs.createReadStream(zipPath), { filename: "workspace.zip" });
            await this.api.push(form, overwrite);
            this.writeIndex(root, pushedIndex);
        } finally {
            fs.rmSync(zipPath, { force: true });
        }
        logger.info(`Pushed ${index.packageKey}.`);
    }

    public move(source: string, target: string, recordOnly: boolean = false): void {
        const root = this.root();
        const sourcePath = this.relativeVisiblePath(root, source);
        const targetPath = this.relativeVisiblePath(root, target);
        const index = this.index(root);
        const tracked = index.files.find(file => file.currentPath === sourcePath);
        if (!tracked) {
            throw new GracefulError(`Tracked file not found: ${sourcePath}`);
        }
        const targetIsTracked = index.files.some(
            file => file.nodeKey !== tracked.nodeKey && file.currentPath.toLowerCase() === targetPath.toLowerCase()
        );
        if (targetIsTracked) {
            throw new GracefulError(`Target path is already tracked: ${targetPath}`);
        }
        const absoluteSource = this.resolveVisiblePath(root, sourcePath);
        const absoluteTarget = this.resolveVisiblePath(root, targetPath);
        if (recordOnly) {
            if (!fs.existsSync(absoluteTarget)) {
                throw new GracefulError(`Moved file not found: ${targetPath}`);
            }
        } else {
            if (fs.existsSync(absoluteTarget) && !this.sameFile(absoluteSource, absoluteTarget)) {
                throw new GracefulError(`Target already exists: ${targetPath}`);
            }
            fs.mkdirSync(path.dirname(absoluteTarget), { recursive: true });
            fs.renameSync(absoluteSource, absoluteTarget);
        }
        tracked.currentPath = targetPath;
        this.writeIndex(root, index);
        logger.info(`Recorded move: ${sourcePath} -> ${targetPath}`);
    }

    private sameFile(source: string, target: string): boolean {
        const sourceStat = fs.lstatSync(source);
        const targetStat = fs.lstatSync(target);
        return (
            source.toLowerCase() === target.toLowerCase() &&
            sourceStat.dev === targetStat.dev &&
            sourceStat.ino === targetStat.ino
        );
    }

    private root(directory?: string): string {
        let current = path.resolve(process.cwd(), directory || ".");
        while (!fs.existsSync(this.indexPath(current))) {
            const parent = path.dirname(current);
            if (parent === current) {
                throw new GracefulError("No Pacman workspace found.");
            }
            current = parent;
        }
        return current;
    }

    private index(root: string): WorkspaceIndex {
        const parsed = JSON.parse(fs.readFileSync(this.indexPath(root), "utf-8")) as WorkspaceIndex;
        if (parsed.version !== 1 || !parsed.packageKey || !Array.isArray(parsed.files)) {
            throw new GracefulError("Unsupported Pacman workspace index.");
        }
        return parsed;
    }

    private relativeVisiblePath(root: string, value: string): string {
        const relative = path.relative(root, path.resolve(process.cwd(), value));
        return this.validateRelative(relative);
    }

    private resolveVisiblePath(root: string, value: string): string {
        const relative = this.validateRelative(value);
        return path.resolve(root, relative);
    }

    private validateRelative(value: string): string {
        const normalized = value.split(path.sep).join("/");
        const folded = normalized.toLowerCase();
        if (
            !normalized ||
            path.isAbsolute(value) ||
            normalized === ".." ||
            folded === ".pacman" ||
            folded.startsWith(".pacman/") ||
            normalized.startsWith("../")
        ) {
            throw new GracefulError(`Invalid workspace path: ${value}`);
        }
        return normalized;
    }

    private indexPath(root: string): string {
        return path.join(root, ".pacman", "index.json");
    }

    private pushedIndex(index: WorkspaceIndex, zipPath: string): WorkspaceIndex {
        const archive = new AdmZip(zipPath);
        return {
            ...index,
            files: index.files.map(file => {
                const entry = archive.getEntry(file.currentPath);
                if (!entry || entry.isDirectory) {
                    throw new GracefulError(`Tracked file is missing from archive: ${file.currentPath}`);
                }
                return {
                    ...file,
                    basePath: file.currentPath,
                    digest: this.digestContent(entry.getData()),
                };
            }),
        };
    }

    private writeIndex(root: string, index: WorkspaceIndex): void {
        fs.writeFileSync(this.indexPath(root), JSON.stringify(index, null, 2) + "\n", { mode: 0o600 });
    }

    private digest(file: string): string {
        return this.digestContent(fs.readFileSync(file));
    }

    private digestContent(content: Buffer): string {
        return `sha256:${createHash("sha256").update(content).digest("hex")}`;
    }
}
