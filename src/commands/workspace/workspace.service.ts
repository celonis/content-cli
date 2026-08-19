import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as FormData from "form-data";
import AdmZip = require("adm-zip");
import { Context } from "../../core/command/cli-context";
import { fileService } from "../../core/utils/file-service";
import { GracefulError, logger } from "../../core/utils/logger";
import { WorkspaceApi } from "./workspace-api";

interface WorkspaceState {
    schemaVersion: number;
    packageKey: string;
    serverRevision: string;
    baselineDigests: Record<string, string>;
    moveHints: Record<string, string>;
}

interface WorkspaceNodeMetadata {
    key: string;
    name: string;
    type: string;
    parentNodeKey?: string | null;
    filesystemName?: string;
    metadata?: Record<string, unknown>;
    additionalFields?: Record<string, unknown>;
}

interface ExpectedFile {
    nodeKey: string;
    path: string;
    digest: string;
}

interface ClassifiedChange extends WorkspaceChange {
    nodeKey?: string;
}

interface WorkspaceSnapshot {
    state: WorkspaceState;
    expectedFiles: ExpectedFile[];
    visibleFiles: Map<string, string>;
    changes: ClassifiedChange[];
}

export interface WorkspaceChange {
    path: string;
    status: "added" | "deleted" | "modified" | "moved" | "moved, modified" | "unresolved";
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
        if (!zip.getEntry(".pacman/state.json")) {
            throw new GracefulError("Archive does not contain .pacman/state.json");
        }
        const temporary = fileService.extractZipBufferToTempDirectory(archive);
        const parent = path.dirname(target);
        let staging: string | undefined;
        try {
            const snapshot = this.snapshot(temporary);
            if (snapshot.state.packageKey !== packageKey) {
                throw new GracefulError("Archive package key does not match the requested package.");
            }
            if (snapshot.changes.length !== 0) {
                throw new GracefulError("Archive content does not match its workspace baseline.");
            }
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
        const changes = this.snapshot(this.root(directory)).changes.map(({ path: filePath, status }) => ({
            path: filePath,
            status,
        }));
        if (changes.length === 0) {
            logger.info("Workspace is clean.");
        } else {
            changes.forEach(change => logger.info(`${change.status}: ${change.path}`));
        }
        return changes;
    }

    public async push(directory?: string, overwrite: boolean = false): Promise<void> {
        const root = this.root(directory);
        const snapshot = this.snapshot(root);
        if (snapshot.changes.some(change => change.status === "unresolved")) {
            throw new GracefulError("Workspace has unresolved file identities. Record the intended moves before push.");
        }
        const zipPath = fileService.zipDirectoryAsSinglePackage(root);
        try {
            const form = new FormData();
            form.append("packageFile", fs.createReadStream(zipPath), { filename: "workspace.zip" });
            await this.api.push(snapshot.state.packageKey, form, overwrite);
            const refreshedArchive = await this.api.checkout(snapshot.state.packageKey);
            this.refreshMetadata(root, refreshedArchive, snapshot.state.packageKey);
        } finally {
            fs.rmSync(zipPath, { force: true });
        }
        logger.info(`Pushed ${snapshot.state.packageKey}.`);
    }

    public move(source: string, target: string, recordOnly: boolean = false): void {
        const root = this.root();
        const sourcePath = this.relativeVisiblePath(root, source);
        const targetPath = this.relativeVisiblePath(root, target);
        const snapshot = this.snapshot(root);
        const tracked = this.trackedFile(snapshot, sourcePath);
        if (!tracked) {
            throw new GracefulError(`Tracked file not found: ${sourcePath}`);
        }
        const targetOwner = snapshot.expectedFiles.find(
            file => file.nodeKey !== tracked.nodeKey && file.path.toLowerCase() === targetPath.toLowerCase()
        );
        if (targetOwner) {
            throw new GracefulError(`Target path is already tracked: ${targetPath}`);
        }
        const absoluteSource = this.resolveVisiblePath(root, sourcePath);
        const absoluteTarget = this.resolveVisiblePath(root, targetPath);
        if (recordOnly) {
            if (!fs.existsSync(absoluteTarget)) {
                throw new GracefulError(`Moved file not found: ${targetPath}`);
            }
            snapshot.state.moveHints[tracked.nodeKey] = targetPath;
            this.writeState(root, snapshot.state);
            logger.info(`Recorded move: ${sourcePath} -> ${targetPath}`);
            return;
        }
        if (!fs.existsSync(absoluteSource)) {
            throw new GracefulError(`Tracked file not found: ${sourcePath}`);
        }
        if (fs.existsSync(absoluteTarget) && !this.sameFile(absoluteSource, absoluteTarget)) {
            throw new GracefulError(`Target already exists: ${targetPath}`);
        }
        fs.mkdirSync(path.dirname(absoluteTarget), { recursive: true });
        fs.renameSync(absoluteSource, absoluteTarget);
        logger.info(`Moved: ${sourcePath} -> ${targetPath}`);
    }

    private snapshot(root: string): WorkspaceSnapshot {
        const state = this.state(root);
        const expectedFiles = this.expectedFiles(root, state);
        const visibleFiles = this.visibleFiles(root);
        return {
            state,
            expectedFiles,
            visibleFiles,
            changes: this.classify(expectedFiles, visibleFiles, state.moveHints),
        };
    }

    private classify(
        expectedFiles: ExpectedFile[],
        visibleFiles: Map<string, string>,
        moveHints: Record<string, string>
    ): ClassifiedChange[] {
        const changes: ClassifiedChange[] = [];
        const consumedPaths = new Set<string>();
        const missing: ExpectedFile[] = [];

        expectedFiles.forEach(file => {
            const hint = moveHints[file.nodeKey];
            if (hint && hint !== file.path) {
                if (visibleFiles.has(file.path) || !visibleFiles.has(hint) || consumedPaths.has(hint)) {
                    changes.push({ nodeKey: file.nodeKey, path: hint, status: "unresolved" });
                    if (visibleFiles.has(hint)) {
                        consumedPaths.add(hint);
                    }
                    if (visibleFiles.has(file.path)) {
                        consumedPaths.add(file.path);
                    }
                    return;
                }
                consumedPaths.add(hint);
                changes.push({
                    nodeKey: file.nodeKey,
                    path: hint,
                    status: visibleFiles.get(hint) === file.digest ? "moved" : "moved, modified",
                });
                return;
            }
            if (visibleFiles.has(file.path)) {
                consumedPaths.add(file.path);
                if (visibleFiles.get(file.path) !== file.digest) {
                    changes.push({ nodeKey: file.nodeKey, path: file.path, status: "modified" });
                }
                return;
            }
            missing.push(file);
        });

        const missingByDigest = this.groupBy(missing, file => file.digest);
        missingByDigest.forEach((files, digest) => {
            const candidates = [...visibleFiles.entries()]
                .filter(([filePath, visibleDigest]) => !consumedPaths.has(filePath) && visibleDigest === digest)
                .map(([filePath]) => filePath);
            if (files.length === 1 && candidates.length === 1) {
                consumedPaths.add(candidates[0]);
                changes.push({ nodeKey: files[0].nodeKey, path: candidates[0], status: "moved" });
                missing.splice(missing.indexOf(files[0]), 1);
                return;
            }
            if (candidates.length > 0) {
                files.forEach(file => {
                    changes.push({ nodeKey: file.nodeKey, path: file.path, status: "unresolved" });
                    missing.splice(missing.indexOf(file), 1);
                });
                candidates.forEach(filePath => {
                    consumedPaths.add(filePath);
                    changes.push({ path: filePath, status: "unresolved" });
                });
            }
        });

        const newPaths = [...visibleFiles.keys()].filter(filePath => !consumedPaths.has(filePath));
        const movedAndEdited = this.possibleMovedAndEdited(missing, newPaths);
        movedAndEdited.forEach(([file, filePath]) => {
            changes.push({ nodeKey: file.nodeKey, path: filePath, status: "unresolved" });
            missing.splice(missing.indexOf(file), 1);
            newPaths.splice(newPaths.indexOf(filePath), 1);
        });
        missing.forEach(file => changes.push({ nodeKey: file.nodeKey, path: file.path, status: "deleted" }));
        newPaths.forEach(filePath => changes.push({ path: filePath, status: "added" }));

        return changes.sort((left, right) => left.path.localeCompare(right.path) || left.status.localeCompare(right.status));
    }

    private possibleMovedAndEdited(missing: ExpectedFile[], newPaths: string[]): Array<[ExpectedFile, string]> {
        const pairs: Array<[ExpectedFile, string]> = [];
        const remainingPaths = new Set(newPaths);
        missing.forEach(file => {
            const matchingBasenames = [...remainingPaths].filter(
                filePath => path.posix.basename(filePath).toLowerCase() === path.posix.basename(file.path).toLowerCase()
            );
            if (matchingBasenames.length === 1) {
                pairs.push([file, matchingBasenames[0]]);
                remainingPaths.delete(matchingBasenames[0]);
            }
        });
        const pairedKeys = new Set(pairs.map(([file]) => file.nodeKey));
        const remainingMissing = missing.filter(file => !pairedKeys.has(file.nodeKey));
        if (remainingMissing.length === 1 && remainingPaths.size === 1) {
            const candidate = [...remainingPaths][0];
            if (path.posix.extname(remainingMissing[0].path).toLowerCase() === path.posix.extname(candidate).toLowerCase()) {
                pairs.push([remainingMissing[0], candidate]);
            }
        }
        return pairs;
    }

    private expectedFiles(root: string, state: WorkspaceState): ExpectedFile[] {
        const nodes = this.nodes(root);
        const byKey = new Map(nodes.map(node => [node.key, node]));
        const pathByKey = new Map<string, string>();
        const resolving = new Set<string>();
        const resolvePath = (node: WorkspaceNodeMetadata): string => {
            const cached = pathByKey.get(node.key);
            if (cached) {
                return cached;
            }
            if (!resolving.add(node.key)) {
                throw new GracefulError(`Circular node hierarchy at ${node.key}.`);
            }
            const segment = this.filesystemName(node);
            let filePath = segment;
            if (node.parentNodeKey && node.parentNodeKey !== state.packageKey) {
                const parent = byKey.get(node.parentNodeKey);
                if (!parent || !this.isFolder(parent)) {
                    throw new GracefulError(`Invalid parent metadata for node ${node.key}.`);
                }
                filePath = `${resolvePath(parent)}/${segment}`;
            }
            resolving.delete(node.key);
            pathByKey.set(node.key, filePath);
            return filePath;
        };
        const expected = nodes
            .filter(node => !this.isFolder(node))
            .map(node => {
                const baseline = state.baselineDigests[node.key];
                if (!baseline || !/^sha256:[0-9a-f]{64}$/.test(baseline)) {
                    throw new GracefulError(`Missing or invalid baseline digest for node ${node.key}.`);
                }
                return { nodeKey: node.key, path: resolvePath(node), digest: baseline };
            });
        const foldedPaths = new Set<string>();
        expected.forEach(file => {
            if (!foldedPaths.add(file.path.toLowerCase())) {
                throw new GracefulError(`Duplicate workspace path in node metadata: ${file.path}`);
            }
        });
        Object.entries(state.moveHints).forEach(([nodeKey, targetPath]) => {
            if (!byKey.has(nodeKey)) {
                throw new GracefulError(`Move hint references unknown node ${nodeKey}.`);
            }
            state.moveHints[nodeKey] = this.validateRelative(targetPath);
        });
        return expected.sort((left, right) => left.path.localeCompare(right.path));
    }

    private nodes(root: string): WorkspaceNodeMetadata[] {
        const directory = path.join(root, ".pacman", "nodes");
        if (!fs.existsSync(directory)) {
            throw new GracefulError("Workspace does not contain .pacman/nodes metadata.");
        }
        return fs
            .readdirSync(directory, { withFileTypes: true })
            .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
            .sort((left, right) => left.name.localeCompare(right.name))
            .map(entry => {
                const node = JSON.parse(fs.readFileSync(path.join(directory, entry.name), "utf-8")) as WorkspaceNodeMetadata;
                if (!node.key || !node.name || !node.type || `${node.key}.json` !== entry.name) {
                    throw new GracefulError(`Invalid node metadata file: ${entry.name}`);
                }
                return node;
            });
    }

    private filesystemName(node: WorkspaceNodeMetadata): string {
        const value = node.filesystemName || node.metadata?.filesystemName || node.additionalFields?.filesystemName;
        if (typeof value !== "string" || !value || value.includes("/") || value.includes("\\")) {
            throw new GracefulError(`Invalid filesystem name for node ${node.key}.`);
        }
        return this.validateRelative(value);
    }

    private visibleFiles(root: string): Map<string, string> {
        const files = new Map<string, string>();
        const foldedPaths = new Set<string>();
        const visit = (directory: string, relativeDirectory: string): void => {
            fs.readdirSync(directory, { withFileTypes: true })
                .sort((left, right) => left.name.localeCompare(right.name))
                .forEach(entry => {
                    if (!relativeDirectory && entry.name.toLowerCase() === ".pacman") {
                        return;
                    }
                    const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
                    const absolute = path.join(directory, entry.name);
                    if (entry.isSymbolicLink()) {
                        throw new GracefulError(`Workspace contains an unsupported symbolic link: ${relative}`);
                    }
                    if (entry.isDirectory()) {
                        visit(absolute, relative);
                        return;
                    }
                    if (!entry.isFile()) {
                        throw new GracefulError(`Workspace contains an unsupported entry: ${relative}`);
                    }
                    const validated = this.validateRelative(relative);
                    if (!foldedPaths.add(validated.toLowerCase())) {
                        throw new GracefulError(`Workspace contains duplicate case-insensitive paths: ${validated}`);
                    }
                    files.set(validated, this.digest(absolute));
                });
        };
        visit(root, "");
        return files;
    }

    private trackedFile(snapshot: WorkspaceSnapshot, sourcePath: string): ExpectedFile | undefined {
        const expected = snapshot.expectedFiles.find(file => file.path === sourcePath);
        if (expected) {
            return expected;
        }
        const hinted = snapshot.expectedFiles.find(file => snapshot.state.moveHints[file.nodeKey] === sourcePath);
        if (hinted) {
            return hinted;
        }
        const classified = snapshot.changes.find(
            change => change.path === sourcePath && change.nodeKey && (change.status === "moved" || change.status === "moved, modified")
        );
        return classified ? snapshot.expectedFiles.find(file => file.nodeKey === classified.nodeKey) : undefined;
    }

    private refreshMetadata(root: string, archive: Buffer, packageKey: string): void {
        const zip = new AdmZip(archive);
        if (!zip.getEntry(".pacman/state.json")) {
            throw new GracefulError("Refreshed archive does not contain .pacman/state.json");
        }
        const extracted = fileService.extractZipBufferToTempDirectory(archive);
        const refreshRoot = fs.mkdtempSync(path.join(root, ".pacman-refresh-"));
        const stagedMetadata = path.join(refreshRoot, "metadata");
        const previousMetadata = path.join(refreshRoot, "previous");
        const metadata = path.join(root, ".pacman");
        try {
            const refreshed = this.snapshot(extracted);
            if (refreshed.state.packageKey !== packageKey || refreshed.changes.length !== 0) {
                throw new GracefulError("Refreshed archive metadata does not match its content.");
            }
            fs.cpSync(path.join(extracted, ".pacman"), stagedMetadata, { recursive: true });
            fs.renameSync(metadata, previousMetadata);
            try {
                fs.renameSync(stagedMetadata, metadata);
            } catch (error) {
                fs.renameSync(previousMetadata, metadata);
                throw error;
            }
        } finally {
            fs.rmSync(extracted, { recursive: true, force: true });
            fs.rmSync(refreshRoot, { recursive: true, force: true });
        }
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
        while (!fs.existsSync(this.statePath(current))) {
            const parent = path.dirname(current);
            if (parent === current) {
                throw new GracefulError("No Pacman workspace found.");
            }
            current = parent;
        }
        return current;
    }

    private state(root: string): WorkspaceState {
        const parsed = JSON.parse(fs.readFileSync(this.statePath(root), "utf-8")) as Partial<WorkspaceState>;
        if (
            parsed.schemaVersion !== 1 ||
            !parsed.packageKey ||
            !parsed.serverRevision ||
            !/^sha256:[0-9a-f]{64}$/.test(parsed.serverRevision) ||
            !parsed.baselineDigests ||
            typeof parsed.baselineDigests !== "object" ||
            Array.isArray(parsed.baselineDigests) ||
            !Object.values(parsed.baselineDigests).every(value => typeof value === "string") ||
            (parsed.moveHints !== undefined &&
                (typeof parsed.moveHints !== "object" ||
                    parsed.moveHints === null ||
                    Array.isArray(parsed.moveHints) ||
                    !Object.values(parsed.moveHints).every(value => typeof value === "string")))
        ) {
            throw new GracefulError("Unsupported Pacman workspace state.");
        }
        return {
            schemaVersion: parsed.schemaVersion,
            packageKey: parsed.packageKey,
            serverRevision: parsed.serverRevision,
            baselineDigests: parsed.baselineDigests,
            moveHints: parsed.moveHints || {},
        };
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
            normalized === "." ||
            normalized === ".." ||
            folded === ".pacman" ||
            folded.startsWith(".pacman/") ||
            normalized.startsWith("../") ||
            normalized.includes("/../") ||
            normalized.includes("/./")
        ) {
            throw new GracefulError(`Invalid workspace path: ${value}`);
        }
        return normalized;
    }

    private statePath(root: string): string {
        return path.join(root, ".pacman", "state.json");
    }

    private writeState(root: string, state: WorkspaceState): void {
        fs.writeFileSync(this.statePath(root), JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
    }

    private digest(file: string): string {
        return `sha256:${createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
    }

    private isFolder(node: WorkspaceNodeMetadata): boolean {
        return node.type.toUpperCase() === "FOLDER";
    }

    private groupBy<T>(values: T[], key: (value: T) => string): Map<string, T[]> {
        const groups = new Map<string, T[]>();
        values.forEach(value => {
            const groupKey = key(value);
            groups.set(groupKey, [...(groups.get(groupKey) || []), value]);
        });
        return groups;
    }
}
