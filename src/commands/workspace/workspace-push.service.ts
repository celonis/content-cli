import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { GracefulError } from "../../core/utils/logger";
import { WorkspaceApi } from "./workspace-api";
import {
    ClassifiedWorkspaceChange,
    ExpectedWorkspaceFile,
    WorkspacePushOutcome,
    WorkspaceSnapshot,
} from "./workspace.models";

interface Selection {
    path: string;
    directory: boolean;
}

export class WorkspacePushService {
    constructor(private readonly api: WorkspaceApi) {}

    public async push(root: string, snapshot: WorkspaceSnapshot, paths: string[]): Promise<WorkspacePushOutcome[]> {
        const changes = this.select(root, snapshot, paths);
        const outcomes: WorkspacePushOutcome[] = [];
        for (const change of changes) {
            try {
                await this.pushChange(root, snapshot, change);
                outcomes.push({ ...change, success: true });
            } catch (error) {
                outcomes.push({
                    ...change,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return outcomes;
    }

    private select(root: string, snapshot: WorkspaceSnapshot, paths: string[]): ClassifiedWorkspaceChange[] {
        if (paths.length === 0) {
            return snapshot.changes;
        }
        const expectedByNodeKey = new Map(snapshot.expectedFiles.map(file => [file.nodeKey, file]));
        const candidates = snapshot.changes.map(change => ({
            change,
            paths: [change.path, change.nodeKey ? expectedByNodeKey.get(change.nodeKey)?.path : undefined].filter(
                (value): value is string => Boolean(value)
            ),
        }));
        const selections = paths.map(value =>
            this.selection(
                root,
                value,
                candidates.flatMap(candidate => candidate.paths)
            )
        );
        return candidates
            .filter(candidate =>
                selections.some(selection =>
                    candidate.paths.some(candidatePath => this.matches(selection, candidatePath))
                )
            )
            .map(candidate => candidate.change);
    }

    private selection(root: string, value: string, candidatePaths: string[]): Selection {
        const absolute = path.resolve(process.cwd(), value);
        const relative = path.relative(root, absolute).split(path.sep).join("/");
        if (
            relative === ".." ||
            relative.startsWith("../") ||
            path.isAbsolute(relative) ||
            relative.toLowerCase() === ".pacman" ||
            relative.toLowerCase().startsWith(".pacman/") ||
            relative.toLowerCase() === ".git" ||
            relative.toLowerCase().startsWith(".git/")
        ) {
            throw new GracefulError(`Invalid workspace path: ${value}`);
        }
        const exists = fs.existsSync(absolute);
        if (exists && fs.lstatSync(absolute).isSymbolicLink()) {
            throw new GracefulError(`Workspace contains an unsupported symbolic link: ${value}`);
        }
        const directory = exists
            ? fs.lstatSync(absolute).isDirectory()
            : candidatePaths.some(candidate => candidate.toLowerCase().startsWith(`${relative.toLowerCase()}/`));
        return { path: relative, directory };
    }

    private matches(selection: Selection, candidatePath: string): boolean {
        const selected = selection.path.toLowerCase();
        const candidate = candidatePath.toLowerCase();
        return selection.directory
            ? !selected || candidate === selected || candidate.startsWith(`${selected}/`)
            : candidate === selected;
    }

    private async pushChange(
        root: string,
        snapshot: WorkspaceSnapshot,
        change: ClassifiedWorkspaceChange
    ): Promise<void> {
        if (change.status === "unresolved") {
            throw new GracefulError("File identity is unresolved. Record the intended move before pushing.");
        }
        const expected = change.nodeKey
            ? snapshot.expectedFiles.find(file => file.nodeKey === change.nodeKey)
            : undefined;
        switch (change.status) {
            case "added":
                await this.api.putFile(
                    snapshot.packageKey,
                    change.path,
                    this.content(root, change.path),
                    this.contentType(change.path),
                    { "If-None-Match": "*" }
                );
                return;
            case "modified": {
                const eTag = await this.currentETag(snapshot.packageKey, this.requireExpected(expected), change.path);
                await this.api.putFile(
                    snapshot.packageKey,
                    change.path,
                    this.content(root, change.path),
                    this.contentType(change.path),
                    { "If-Match": eTag }
                );
                return;
            }
            case "moved": {
                const tracked = this.requireExpected(expected);
                const eTag = await this.currentETag(snapshot.packageKey, tracked, tracked.path);
                await this.api.moveFile(snapshot.packageKey, tracked.path, change.path, eTag);
                return;
            }
            case "moved, modified": {
                const tracked = this.requireExpected(expected);
                let eTag = await this.currentETag(snapshot.packageKey, tracked, tracked.path);
                if (tracked.path !== change.path) {
                    eTag = (await this.api.moveFile(snapshot.packageKey, tracked.path, change.path, eTag)).eTag;
                }
                await this.api.putFile(
                    snapshot.packageKey,
                    change.path,
                    this.content(root, change.path),
                    this.contentType(change.path),
                    { "If-Match": eTag }
                );
                return;
            }
            case "deleted": {
                const tracked = this.requireExpected(expected);
                const eTag = await this.currentETag(snapshot.packageKey, tracked, tracked.path);
                await this.api.deleteFile(snapshot.packageKey, tracked.path, eTag);
                return;
            }
        }
    }

    private async currentETag(packageKey: string, expected: ExpectedWorkspaceFile, filePath: string): Promise<string> {
        if (!expected.digest) {
            throw new GracefulError(`Missing synchronization digest: ${filePath}`);
        }
        const current = await this.api.readFile(packageKey, filePath);
        if (this.digest(current.body) !== expected.digest) {
            throw new GracefulError(`Remote file changed after the workspace was synchronized: ${filePath}`);
        }
        return current.eTag;
    }

    private requireExpected(expected: ExpectedWorkspaceFile | undefined): ExpectedWorkspaceFile {
        if (!expected) {
            throw new GracefulError("Tracked file metadata is missing.");
        }
        return expected;
    }

    private content(root: string, filePath: string): Buffer {
        const absolute = path.resolve(root, filePath);
        if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile()) {
            throw new GracefulError(`Workspace file is missing: ${filePath}`);
        }
        return fs.readFileSync(absolute);
    }

    private contentType(filePath: string): string {
        switch (path.posix.extname(filePath).toLowerCase()) {
            case ".md":
                return "text/markdown";
            case ".html":
            case ".htm":
                return "text/html";
            case ".json":
                return "application/json";
            default:
                return "application/octet-stream";
        }
    }

    private digest(content: Buffer): string {
        return `sha256:${createHash("sha256").update(content).digest("hex")}`;
    }
}
