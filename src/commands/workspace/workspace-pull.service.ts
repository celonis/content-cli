import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { GracefulError } from "../../core/utils/logger";
import { WorkspaceApi } from "./workspace-api";
import { selectWorkspaceCandidates } from "./workspace-path-selection";
import {
    ClassifiedWorkspaceChange,
    ExpectedWorkspaceFile,
    WorkspaceManifest,
    WorkspaceManifestNode,
    WorkspaceNodeMetadata,
    WorkspacePullOutcome,
    WorkspacePullStatus,
    WorkspaceSnapshot,
    WorkspaceState,
} from "./workspace.models";

const FORBIDDEN_METADATA_FIELDS = [
    "configuration",
    "packageKey",
    "packageNodeKey",
    "branchKey",
    "creationDate",
    "changeDate",
    "revision",
    "serverRevision",
];

interface PullOperation {
    nodeKey: string;
    path: string;
    localPath?: string;
    status: WorkspacePullStatus;
    entry?: WorkspaceManifestNode;
    localNode?: WorkspaceNodeMetadata;
    localChange?: ClassifiedWorkspaceChange;
    conflict?: string;
    converged?: boolean;
}

export interface WorkspacePullResult {
    outcomes: WorkspacePullOutcome[];
    state: WorkspaceState;
}

export class WorkspacePullService {
    constructor(private readonly api: WorkspaceApi) {}

    public async pull(
        root: string,
        snapshot: WorkspaceSnapshot,
        localNodes: WorkspaceNodeMetadata[],
        paths: string[],
        manifest: WorkspaceManifest
    ): Promise<WorkspacePullResult> {
        this.validateManifest(manifest);
        const operations = this.select(root, paths, this.operations(snapshot, localNodes, manifest));
        const state: WorkspaceState = {
            ...snapshot.state,
            baselineDigests: { ...snapshot.state.baselineDigests },
            moveHints: { ...snapshot.state.moveHints },
        };
        delete state.serverRevision;
        delete state.refreshRequired;
        const outcomes: WorkspacePullOutcome[] = [];
        for (const operation of this.order(operations)) {
            try {
                if (operation.conflict) {
                    throw new GracefulError(operation.conflict);
                }
                await this.apply(root, snapshot.packageKey, operation, manifest, state);
                outcomes.push({
                    path: operation.path,
                    status: operation.status,
                    nodeKey: operation.nodeKey,
                    success: true,
                });
            } catch (error) {
                outcomes.push({
                    path: operation.path,
                    status: "conflict",
                    nodeKey: operation.nodeKey,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return { outcomes, state };
    }

    public hydrateBaseline(
        state: WorkspaceState,
        packageKey: string,
        activeBranch: string,
        manifest: WorkspaceManifest
    ): WorkspaceState {
        this.validateManifest(manifest);
        const hydrated: WorkspaceState = {
            schemaVersion: 1,
            activePackageKey: packageKey,
            activeBranch,
            baselineDigests: Object.fromEntries(
                manifest.nodes
                    .filter(entry => entry.kind === "file")
                    .map(entry => [entry.nodeKey, entry.contentDigest!])
            ),
            moveHints: {},
        };
        if (state.git) {
            hydrated.git = state.git;
        }
        return hydrated;
    }

    public applyPushResults(
        root: string,
        state: WorkspaceState,
        manifest: WorkspaceManifest,
        outcomes: Array<{
            nodeKey?: string;
            localNodeKey?: string;
            status: string;
            success: boolean;
            remoteChanged?: boolean;
        }>
    ): WorkspaceState {
        this.validateManifest(manifest);
        const byNodeKey = new Map(manifest.nodes.map(entry => [entry.nodeKey, entry]));
        const next: WorkspaceState = {
            ...state,
            baselineDigests: { ...state.baselineDigests },
            moveHints: { ...state.moveHints },
        };
        delete next.serverRevision;
        delete next.refreshRequired;
        outcomes
            .filter(outcome => (outcome.success || outcome.remoteChanged) && outcome.nodeKey)
            .forEach(outcome => {
                const nodeKey = outcome.nodeKey!;
                if (outcome.localNodeKey && outcome.localNodeKey !== nodeKey) {
                    this.removeMetadata(root, outcome.localNodeKey);
                    delete next.baselineDigests[outcome.localNodeKey];
                    delete next.moveHints[outcome.localNodeKey];
                }
                const entry = byNodeKey.get(nodeKey);
                if (!entry) {
                    if (outcome.status === "deleted") {
                        this.removeMetadata(root, nodeKey);
                        delete next.baselineDigests[nodeKey];
                        delete next.moveHints[nodeKey];
                    }
                    return;
                }
                this.writeMetadataWithAncestors(root, entry, manifest);
                if (entry.kind === "file") {
                    next.baselineDigests[nodeKey] = entry.contentDigest!;
                }
                delete next.moveHints[nodeKey];
            });
        return next;
    }

    private operations(
        snapshot: WorkspaceSnapshot,
        localNodes: WorkspaceNodeMetadata[],
        manifest: WorkspaceManifest
    ): PullOperation[] {
        const localByKey = new Map(localNodes.map(node => [node.key, node]));
        const localPaths = this.localPaths(localNodes);
        const expectedByKey = new Map(snapshot.expectedFiles.map(file => [file.nodeKey, file]));
        const changeByKey = new Map(
            snapshot.changes.flatMap(change => (change.nodeKey ? [[change.nodeKey, change] as const] : []))
        );
        const remoteByKey = new Map(manifest.nodes.map(entry => [entry.nodeKey, entry]));
        const operations: PullOperation[] = [];
        manifest.nodes.forEach(entry => {
            const localNode = localByKey.get(entry.nodeKey);
            const localPath = localPaths.get(entry.nodeKey);
            const expected = expectedByKey.get(entry.nodeKey);
            const localChange = changeByKey.get(entry.nodeKey);
            if (!localNode) {
                const occupied = entry.kind === "file" && this.visibleAt(snapshot, entry.path);
                operations.push({
                    nodeKey: entry.nodeKey,
                    path: entry.path,
                    status: "added",
                    entry,
                    conflict: occupied
                        ? `Remote file conflicts with an untracked local path: ${entry.path}`
                        : undefined,
                });
                return;
            }
            const remoteChanged = this.remoteChanged(entry, localNode, localPath, expected);
            if (!remoteChanged) {
                return;
            }
            const operation: PullOperation = {
                nodeKey: entry.nodeKey,
                path: entry.path,
                localPath,
                status: localPath && localPath.toLowerCase() !== entry.path.toLowerCase() ? "moved" : "modified",
                entry,
                localNode,
                localChange,
            };
            if (localChange) {
                const localDigest = snapshot.visibleFiles.get(localChange.path);
                operation.converged =
                    entry.kind === "file" &&
                    localChange.path.toLowerCase() === entry.path.toLowerCase() &&
                    localDigest === entry.contentDigest;
                if (!operation.converged) {
                    operation.conflict = `Local and remote changes conflict for node ${entry.nodeKey}.`;
                }
            }
            operations.push(operation);
        });
        localNodes
            .filter(node => !remoteByKey.has(node.key))
            .forEach(node => {
                const localPath = localPaths.get(node.key);
                if (!localPath) {
                    return;
                }
                const localChange = changeByKey.get(node.key);
                operations.push({
                    nodeKey: node.key,
                    path: localPath,
                    localPath,
                    status: "deleted",
                    localNode: node,
                    localChange,
                    converged: localChange?.status === "deleted",
                    conflict:
                        localChange && localChange.status !== "deleted"
                            ? `Remote deletion conflicts with local changes for node ${node.key}.`
                            : undefined,
                });
            });
        return operations;
    }

    private select(root: string, paths: string[], operations: PullOperation[]): PullOperation[] {
        return selectWorkspaceCandidates(
            root,
            paths,
            operations.map(operation => ({
                value: operation,
                paths: [operation.path, operation.localPath].filter((value): value is string => Boolean(value)),
            }))
        );
    }

    private order(operations: PullOperation[]): PullOperation[] {
        const priority = (operation: PullOperation): number => {
            if (operation.entry?.kind === "folder" && operation.status !== "deleted") {
                return 0;
            }
            if (operation.localNode && this.isFolder(operation.localNode) && operation.status === "deleted") {
                return 2;
            }
            return 1;
        };
        return [...operations].sort(
            (left, right) => priority(left) - priority(right) || left.path.localeCompare(right.path)
        );
    }

    private async apply(
        root: string,
        packageKey: string,
        operation: PullOperation,
        manifest: WorkspaceManifest,
        state: WorkspaceState
    ): Promise<void> {
        if (operation.status === "deleted") {
            this.applyDelete(root, operation);
            this.removeMetadata(root, operation.nodeKey);
            delete state.baselineDigests[operation.nodeKey];
            delete state.moveHints[operation.nodeKey];
            return;
        }
        const entry = operation.entry!;
        if (entry.kind === "folder") {
            this.applyFolder(root, operation, entry);
        }
        if (entry.kind === "file" && !operation.converged) {
            await this.applyFile(root, packageKey, operation, entry);
        }
        this.writeMetadataWithAncestors(root, entry, manifest);
        if (entry.kind === "file") {
            state.baselineDigests[entry.nodeKey] = entry.contentDigest!;
        }
        delete state.moveHints[entry.nodeKey];
    }

    private async applyFile(
        root: string,
        packageKey: string,
        operation: PullOperation,
        entry: WorkspaceManifestNode
    ): Promise<void> {
        const target = this.resolve(root, entry.path);
        const source = operation.localPath ? this.resolve(root, operation.localPath) : undefined;
        const moved = Boolean(source && source.toLowerCase() !== target.toLowerCase());
        if (moved && fs.existsSync(target)) {
            if (!this.movedTargetMatches(source, target, entry)) {
                throw new GracefulError(`Remote file move conflicts with an existing local path: ${entry.path}`);
            }
            return;
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        if (this.localFileDigest(source) === entry.contentDigest) {
            if (moved && source) {
                fs.renameSync(source, target);
            }
            return;
        }
        const remote = await this.api.readFile(packageKey, entry.path);
        if (this.digestBuffer(remote.body) !== entry.contentDigest || remote.body.length !== entry.size) {
            throw new GracefulError(`Remote file body does not match its manifest: ${entry.path}`);
        }
        fs.writeFileSync(target, remote.body);
        if (moved && source && fs.existsSync(source)) {
            fs.rmSync(source);
        }
    }

    private movedTargetMatches(source: string | undefined, target: string, entry: WorkspaceManifestNode): boolean {
        return Boolean(
            source &&
                !fs.existsSync(source) &&
                fs.lstatSync(target).isFile() &&
                this.digest(target) === entry.contentDigest
        );
    }

    private localFileDigest(source: string | undefined): string | undefined {
        return source && fs.existsSync(source) && fs.lstatSync(source).isFile() ? this.digest(source) : undefined;
    }

    private applyFolder(root: string, operation: PullOperation, entry: WorkspaceManifestNode): void {
        const target = this.resolve(root, entry.path);
        const source = operation.localPath ? this.resolve(root, operation.localPath) : undefined;
        const moved = Boolean(source && source.toLowerCase() !== target.toLowerCase());
        if (!moved) {
            if (fs.existsSync(target) && !fs.lstatSync(target).isDirectory()) {
                throw new GracefulError(`Remote folder conflicts with an existing local path: ${entry.path}`);
            }
            fs.mkdirSync(target, { recursive: true });
            return;
        }
        if (fs.existsSync(target)) {
            if (source && !fs.existsSync(source) && fs.lstatSync(target).isDirectory()) {
                return;
            }
            throw new GracefulError(`Remote folder move conflicts with an existing local path: ${entry.path}`);
        }
        if (!source || !fs.existsSync(source)) {
            fs.mkdirSync(target, { recursive: true });
            return;
        }
        if (!fs.lstatSync(source).isDirectory()) {
            throw new GracefulError(`Remote folder move source is not a directory: ${operation.localPath}`);
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.renameSync(source, target);
    }

    private applyDelete(root: string, operation: PullOperation): void {
        if (operation.localNode && this.isFolder(operation.localNode)) {
            const metadataDirectory = path.join(root, ".pacman", "nodes");
            const hasChildren = fs
                .readdirSync(metadataDirectory)
                .filter(file => file.endsWith(".json") && file !== `${operation.nodeKey}.json`)
                .some(file => {
                    const metadata = JSON.parse(
                        fs.readFileSync(path.join(metadataDirectory, file), "utf-8")
                    ) as WorkspaceNodeMetadata;
                    return metadata.parentNodeKey === operation.nodeKey;
                });
            if (hasChildren) {
                throw new GracefulError(`Remote folder deletion still has local children: ${operation.path}`);
            }
            const visible = this.resolve(root, operation.localPath || operation.path);
            if (fs.existsSync(visible)) {
                fs.rmdirSync(visible);
            }
            return;
        }
        const visible = this.resolve(root, operation.localPath || operation.path);
        if (fs.existsSync(visible)) {
            fs.rmSync(visible);
        }
    }

    private writeMetadata(root: string, entry: WorkspaceManifestNode, manifest: WorkspaceManifest): void {
        this.writeDocument(root, entry, manifest);
        const metadataDirectory = path.join(root, ".pacman", "nodes");
        fs.mkdirSync(metadataDirectory, { recursive: true });
        fs.writeFileSync(
            path.join(metadataDirectory, `${entry.nodeKey}.json`),
            `${JSON.stringify(entry.metadata, null, 2)}\n`
        );
    }

    private writeDocument(root: string, entry: WorkspaceManifestNode, manifest: WorkspaceManifest): void {
        const reference = entry.metadata.serializedDocumentRef;
        if (!reference) {
            return;
        }
        const match = /^\.pacman\/documents\/([0-9a-f]{64})\.bin$/.exec(reference);
        if (!match) {
            throw new GracefulError(`Invalid document reference for node ${entry.nodeKey}.`);
        }
        const digest = `sha256:${match[1]}`;
        const encoded = manifest.documents[digest];
        if (typeof encoded !== "string") {
            throw new GracefulError(`Workspace manifest is missing document ${digest}.`);
        }
        const document = Buffer.from(encoded, "base64");
        if (this.digestBuffer(document) !== digest) {
            throw new GracefulError(`Workspace manifest document digest does not match ${digest}.`);
        }
        const target = path.join(root, reference);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, document);
    }

    private writeMetadataWithAncestors(
        root: string,
        entry: WorkspaceManifestNode,
        manifest: WorkspaceManifest,
        visited: Set<string> = new Set()
    ): void {
        if (!visited.add(entry.nodeKey)) {
            throw new GracefulError(`Circular workspace manifest hierarchy at ${entry.nodeKey}.`);
        }
        const parentKey = entry.metadata.parentNodeKey;
        if (parentKey) {
            const parent = manifest.nodes.find(candidate => candidate.nodeKey === parentKey);
            if (parent?.kind !== "folder") {
                throw new GracefulError(`Workspace manifest has an invalid parent for node ${entry.nodeKey}.`);
            }
            this.writeMetadataWithAncestors(root, parent, manifest, visited);
        }
        this.writeMetadata(root, entry, manifest);
        visited.delete(entry.nodeKey);
    }

    private removeMetadata(root: string, nodeKey: string): void {
        fs.rmSync(path.join(root, ".pacman", "nodes", `${nodeKey}.json`), { force: true });
    }

    private remoteChanged(
        entry: WorkspaceManifestNode,
        localNode: WorkspaceNodeMetadata,
        localPath: string | undefined,
        expected: ExpectedWorkspaceFile | undefined
    ): boolean {
        if (entry.path.toLowerCase() !== localPath?.toLowerCase() || !this.sameMetadata(entry.metadata, localNode)) {
            return true;
        }
        return entry.kind === "file" && entry.contentDigest !== expected?.digest;
    }

    private localPaths(nodes: WorkspaceNodeMetadata[]): Map<string, string> {
        const byKey = new Map(nodes.map(node => [node.key, node]));
        const paths = new Map<string, string>();
        const resolving = new Set<string>();
        const resolve = (node: WorkspaceNodeMetadata): string => {
            const cached = paths.get(node.key);
            if (cached) {
                return cached;
            }
            if (resolving.has(node.key)) {
                throw new GracefulError(`Circular node hierarchy at ${node.key}.`);
            }
            resolving.add(node.key);
            const segment = this.filesystemName(node);
            const parent = node.parentNodeKey ? byKey.get(node.parentNodeKey) : undefined;
            const value = parent ? `${resolve(parent)}/${segment}` : segment;
            resolving.delete(node.key);
            paths.set(node.key, value);
            return value;
        };
        nodes.forEach(resolve);
        return paths;
    }

    private validateManifest(manifest: WorkspaceManifest): void {
        if (!manifest || !Array.isArray(manifest.nodes) || !manifest.documents || Array.isArray(manifest.documents)) {
            throw new GracefulError("Unsupported workspace manifest.");
        }
        const keys = new Set<string>();
        const paths = new Set<string>();
        manifest.nodes.forEach(entry => {
            const foldedPath = entry.path?.toLowerCase();
            const metadata = entry.metadata as unknown as Record<string, unknown>;
            if (
                !entry.nodeKey ||
                !this.validManifestPath(entry.path) ||
                entry.metadata?.key !== entry.nodeKey ||
                FORBIDDEN_METADATA_FIELDS.some(field => field in metadata) ||
                "body" in (entry as unknown as Record<string, unknown>) ||
                (entry.kind !== "file" && entry.kind !== "folder") ||
                this.isFolder(entry.metadata) !== (entry.kind === "folder") ||
                keys.has(entry.nodeKey) ||
                paths.has(foldedPath) ||
                (entry.kind === "file" &&
                    (!entry.assetType ||
                        !entry.mediaType ||
                        !/^sha256:[0-9a-f]{64}$/.test(entry.contentDigest || "") ||
                        typeof entry.size !== "number" ||
                        !Number.isSafeInteger(entry.size) ||
                        entry.size < 0 ||
                        !/^"sha256:[0-9a-f]{64}"$/.test(entry.eTag || "")))
            ) {
                throw new GracefulError("Unsupported workspace manifest.");
            }
            keys.add(entry.nodeKey);
            paths.add(foldedPath);
        });
        const byKey = new Map(manifest.nodes.map(entry => [entry.nodeKey, entry]));
        const resolved = new Set<string>();
        const resolve = (entry: WorkspaceManifestNode, resolving: Set<string>): void => {
            if (resolved.has(entry.nodeKey)) {
                return;
            }
            if (!resolving.add(entry.nodeKey)) {
                throw new GracefulError("Workspace manifest contains a circular hierarchy.");
            }
            const parentKey = entry.metadata.parentNodeKey;
            if (parentKey) {
                const parent = byKey.get(parentKey);
                if (parent?.kind !== "folder") {
                    throw new GracefulError("Workspace manifest contains an invalid parent relationship.");
                }
                resolve(parent, resolving);
            }
            resolving.delete(entry.nodeKey);
            resolved.add(entry.nodeKey);
        };
        manifest.nodes.forEach(entry => {
            resolve(entry, new Set());
            this.validateDocument(entry, manifest);
        });
        if (!Object.values(manifest.documents).every(value => typeof value === "string")) {
            throw new GracefulError("Unsupported workspace manifest.");
        }
    }

    private validateDocument(entry: WorkspaceManifestNode, manifest: WorkspaceManifest): void {
        const reference = entry.metadata.serializedDocumentRef;
        if (!reference) {
            return;
        }
        const match = /^\.pacman\/documents\/([0-9a-f]{64})\.bin$/.exec(reference);
        const digest = match ? `sha256:${match[1]}` : undefined;
        const encoded = digest ? manifest.documents[digest] : undefined;
        if (!digest || typeof encoded !== "string" || this.digestBuffer(Buffer.from(encoded, "base64")) !== digest) {
            throw new GracefulError(`Workspace manifest has an invalid document for node ${entry.nodeKey}.`);
        }
    }

    private validManifestPath(value: string | undefined): boolean {
        if (!value || value.includes("\\") || path.posix.isAbsolute(value)) {
            return false;
        }
        const segments = value.split("/");
        const first = segments[0].toLowerCase();
        return (
            first !== ".pacman" &&
            first !== ".git" &&
            segments.every(segment => Boolean(segment) && segment !== "." && segment !== "..")
        );
    }

    private visibleAt(snapshot: WorkspaceSnapshot, filePath: string): boolean {
        return [...snapshot.visibleFiles.keys()].some(value => value.toLowerCase() === filePath.toLowerCase());
    }

    private sameMetadata(left: WorkspaceNodeMetadata, right: WorkspaceNodeMetadata): boolean {
        return JSON.stringify(this.sorted(left)) === JSON.stringify(this.sorted(right));
    }

    private sorted(value: unknown): unknown {
        if (Array.isArray(value)) {
            return value.map(item => this.sorted(item));
        }
        if (value && typeof value === "object") {
            return Object.fromEntries(
                Object.entries(value as Record<string, unknown>)
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([key, item]) => [key, this.sorted(item)])
            );
        }
        return value;
    }

    private filesystemName(node: WorkspaceNodeMetadata): string {
        const value = node.filesystemName || node.metadata?.filesystemName || node.additionalFields?.filesystemName;
        if (typeof value !== "string" || !value || value.includes("/") || value.includes("\\")) {
            throw new GracefulError(`Invalid filesystem name for node ${node.key}.`);
        }
        return value;
    }

    private resolve(root: string, filePath: string): string {
        const resolved = path.resolve(root, filePath);
        if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
            throw new GracefulError(`Invalid workspace path: ${filePath}`);
        }
        return resolved;
    }

    private digest(file: string): string {
        return this.digestBuffer(fs.readFileSync(file));
    }

    private digestBuffer(content: Buffer): string {
        return `sha256:${createHash("sha256").update(content).digest("hex")}`;
    }

    private isFolder(node: WorkspaceNodeMetadata): boolean {
        return node.type.toUpperCase() === "FOLDER";
    }
}
