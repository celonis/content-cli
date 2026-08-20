import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { GracefulError } from "../../core/utils/logger";
import { WorkspaceApi } from "./workspace-api";
import { selectWorkspaceCandidates } from "./workspace-path-selection";
import {
    ClassifiedWorkspaceChange,
    ExpectedWorkspaceFile,
    WorkspacePushOutcome,
    WorkspaceSnapshot,
} from "./workspace.models";

interface WorkspacePushOperationError extends Error {
    remoteChanged: boolean;
}

function operationError(error: unknown, remoteChanged: boolean): WorkspacePushOperationError {
    return Object.assign(new Error(error instanceof Error ? error.message : String(error)), { remoteChanged });
}

function isOperationError(error: unknown): error is WorkspacePushOperationError {
    return error instanceof Error && "remoteChanged" in error && typeof error.remoteChanged === "boolean";
}

export class WorkspacePushService {
    constructor(private readonly api: WorkspaceApi) {}

    public async push(root: string, snapshot: WorkspaceSnapshot, paths: string[]): Promise<WorkspacePushOutcome[]> {
        const changes = this.order(this.select(root, snapshot, paths));
        const outcomes: WorkspacePushOutcome[] = [];
        for (const change of changes) {
            try {
                const result = await this.pushChange(root, snapshot, change);
                outcomes.push({
                    ...change,
                    nodeKey: result?.nodeKey || change.nodeKey,
                    localNodeKey: result?.nodeKey !== change.nodeKey ? change.nodeKey : undefined,
                    success: true,
                    remoteChanged: true,
                });
            } catch (error) {
                outcomes.push({
                    ...change,
                    success: false,
                    remoteChanged: isOperationError(error) && error.remoteChanged,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return outcomes;
    }

    private select(root: string, snapshot: WorkspaceSnapshot, paths: string[]): ClassifiedWorkspaceChange[] {
        const expectedByNodeKey = new Map(snapshot.expectedFiles.map(file => [file.nodeKey, file]));
        const candidates = snapshot.changes.map(change => ({
            value: change,
            paths: [change.path, change.nodeKey ? expectedByNodeKey.get(change.nodeKey)?.path : undefined].filter(
                (value): value is string => Boolean(value)
            ),
        }));
        return selectWorkspaceCandidates(root, paths, candidates);
    }

    private order(changes: ClassifiedWorkspaceChange[]): ClassifiedWorkspaceChange[] {
        const priority = (change: ClassifiedWorkspaceChange): number => {
            switch (change.status) {
                case "deleted":
                    return 0;
                case "moved":
                case "moved, modified":
                    return 1;
                case "modified":
                    return 2;
                case "added":
                    return 3;
                case "unresolved":
                    return 4;
            }
        };
        return [...changes].sort(
            (left, right) => priority(left) - priority(right) || left.path.localeCompare(right.path)
        );
    }

    private async pushChange(
        root: string,
        snapshot: WorkspaceSnapshot,
        change: ClassifiedWorkspaceChange
    ): Promise<import("./workspace.models").NodeFileWriteResponse | undefined> {
        if (change.status === "unresolved") {
            throw new GracefulError("File identity is unresolved. Record the intended move before pushing.");
        }
        const expected = change.nodeKey
            ? snapshot.expectedFiles.find(file => file.nodeKey === change.nodeKey)
            : undefined;
        switch (change.status) {
            case "added":
                return this.api.putFile(
                    snapshot.packageKey,
                    change.path,
                    this.content(root, change.path),
                    this.contentType(change.path),
                    { "If-None-Match": "*" }
                );
            case "modified": {
                const eTag = await this.currentETag(snapshot.packageKey, this.requireExpected(expected), change.path);
                return this.api.putFile(
                    snapshot.packageKey,
                    change.path,
                    this.content(root, change.path),
                    this.contentType(change.path),
                    { "If-Match": eTag }
                );
            }
            case "moved": {
                const tracked = this.requireExpected(expected);
                const eTag = await this.currentETag(snapshot.packageKey, tracked, tracked.path);
                return this.api.moveFile(snapshot.packageKey, tracked.path, change.path, eTag);
            }
            case "moved, modified": {
                const tracked = this.requireExpected(expected);
                let eTag = await this.currentETag(snapshot.packageKey, tracked, tracked.path);
                let moved = false;
                if (tracked.path !== change.path) {
                    eTag = (await this.api.moveFile(snapshot.packageKey, tracked.path, change.path, eTag)).eTag;
                    moved = true;
                }
                try {
                    return await this.api.putFile(
                        snapshot.packageKey,
                        change.path,
                        this.content(root, change.path),
                        this.contentType(change.path),
                        { "If-Match": eTag }
                    );
                } catch (error) {
                    throw operationError(error, moved);
                }
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
