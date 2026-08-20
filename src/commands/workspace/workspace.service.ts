import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as FormData from "form-data";
import AdmZip = require("adm-zip");
import { Context } from "../../core/command/cli-context";
import { fileService } from "../../core/utils/file-service";
import { GracefulError, logger } from "../../core/utils/logger";
import { WorkspaceApi } from "./workspace-api";
import { classifyWorkspaceChanges } from "./workspace-change-classifier";
import { WorkspacePushService } from "./workspace-push.service";
import {
    ExpectedWorkspaceFile,
    WorkspaceChange,
    WorkspaceNodeMetadata,
    WorkspacePackageIdentity,
    WorkspacePushOptions,
    WorkspaceSnapshot,
    WorkspaceState,
} from "./workspace.models";

const NON_SEMANTIC_NODE_FIELDS = [
    "configuration",
    "invalidConfiguration",
    "invalidContent",
    "id",
    "workingDraftId",
    "activatedDraftId",
    "stagingDraftId",
    "prodDraftId",
    "archivedDraftId",
    "packageNodeId",
    "creationDate",
    "changeDate",
    "deletedAt",
    "archivedAt",
    "createdBy",
    "updatedBy",
    "deletedBy",
    "archivedBy",
    "optimisticLockVersion",
    "revision",
    "serverRevision",
    "lastModified",
    "lastModifiedAt",
    "lastModifiedBy",
];

export { WorkspaceChange } from "./workspace.models";

export class WorkspaceService {
    private readonly api: WorkspaceApi;

    constructor(context: Context) {
        this.api = new WorkspaceApi(context);
    }

    public async clone(packageKey: string, directory?: string): Promise<void> {
        const target = path.resolve(process.cwd(), directory || packageKey);
        if (fs.existsSync(target)) {
            throw new GracefulError(`Destination already exists: ${target}`);
        }
        const temporary = this.validatedArchive(await this.api.download(packageKey), packageKey);
        const parent = path.dirname(target);
        let staging: string | undefined;
        try {
            fs.mkdirSync(parent, { recursive: true });
            staging = fs.mkdtempSync(path.join(parent, ".pacman-clone-"));
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
        logger.info(`Cloned ${packageKey} to ${target}`);
    }

    public async pull(directory?: string): Promise<void> {
        const root = this.root(directory);
        const packageKey = this.packageIdentity(root).packageKey;
        const hasLocalState = fs.existsSync(this.statePath(root));
        const localState = hasLocalState ? this.state(root) : undefined;
        if (localState && !localState.refreshRequired && this.snapshot(root).changes.length !== 0) {
            throw new GracefulError("Workspace has local changes. Push or discard them before pull.");
        }
        const download = await this.api.download(packageKey);
        if (localState?.refreshRequired) {
            const moveHints = localState.moveHints;
            this.refreshMetadata(root, download, packageKey);
            const refreshed = this.state(root);
            this.writeState(root, { ...refreshed, moveHints: { ...refreshed.moveHints, ...moveHints } });
            logger.info(`Pulled ${packageKey}.`);
            return;
        }
        const temporary = this.validatedArchive(download, packageKey);
        try {
            if (localState) {
                this.replaceWorkspaceContents(root, temporary);
            } else {
                this.reconcileLocalState(root, temporary);
            }
        } finally {
            fs.rmSync(temporary, { recursive: true, force: true });
        }
        logger.info(`Pulled ${packageKey}.`);
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

    public async push(paths: string[] = [], options: WorkspacePushOptions = {}): Promise<void> {
        if (options.full) {
            if (paths.length > 0) {
                throw new GracefulError("Workspace paths cannot be combined with --full.");
            }
            await this.pushFull(Boolean(options.overwrite));
            return;
        }
        if (options.overwrite) {
            throw new GracefulError("--overwrite requires --full.");
        }
        const root = this.root();
        const snapshot = this.snapshot(root);
        const outcomes = await new WorkspacePushService(this.api).push(root, snapshot, paths);
        outcomes.forEach(outcome =>
            logger.info(
                `${outcome.success ? "succeeded" : "failed"}: ${outcome.status} ${outcome.path}` +
                    (outcome.error ? ` (${outcome.error})` : "")
            )
        );
        const succeeded = outcomes.filter(outcome => outcome.success);
        const failed = outcomes.filter(outcome => !outcome.success);
        if (succeeded.length === 0) {
            if (failed.length > 0) {
                throw new GracefulError(`Workspace push failed for ${failed.length} file(s).`);
            }
            logger.info("Workspace is clean.");
            return;
        }
        const retainedHints = Object.fromEntries(
            failed
                .filter(
                    outcome => outcome.nodeKey && (outcome.status === "moved" || outcome.status === "moved, modified")
                )
                .map(outcome => [outcome.nodeKey!, outcome.path])
        );
        try {
            this.refreshMetadata(root, await this.api.download(snapshot.packageKey), snapshot.packageKey);
            const refreshed = this.state(root);
            this.writeState(root, {
                ...refreshed,
                moveHints: { ...refreshed.moveHints, ...retainedHints },
            });
        } catch (error) {
            this.writeState(root, {
                ...snapshot.state,
                moveHints: { ...snapshot.state.moveHints, ...retainedHints },
                refreshRequired: true,
            });
            const failure = new GracefulError(
                "Workspace changes reached the server, but local synchronization state could not be refreshed. Run workspace pull before retrying."
            );
            failure.cause = error;
            throw failure;
        }
        if (failed.length > 0) {
            throw new GracefulError(`Workspace push failed for ${failed.length} file(s).`);
        }
        logger.info(`Pushed ${snapshot.packageKey}.`);
    }

    private async pushFull(overwrite: boolean): Promise<void> {
        const root = this.root();
        const snapshot = this.snapshot(root);
        if (snapshot.changes.some(change => change.status === "unresolved")) {
            throw new GracefulError("Workspace has unresolved file identities. Record the intended moves before push.");
        }
        const zipPath = fileService.zipDirectoryAsSinglePackage(root, filePath => {
            const folded = filePath.toLowerCase();
            return (
                folded !== ".git" &&
                !folded.startsWith(".git/") &&
                folded !== ".pacman/local" &&
                !folded.startsWith(".pacman/local/")
            );
        });
        try {
            const form = new FormData();
            form.append("packageFile", fs.createReadStream(zipPath), { filename: "workspace.zip" });
            const moves = Object.fromEntries(
                snapshot.changes
                    .filter(
                        change =>
                            Boolean(change.nodeKey) &&
                            (change.status === "moved" || change.status === "moved, modified")
                    )
                    .map(change => [change.nodeKey!, change.path])
            );
            if (Object.keys(moves).length > 0) {
                form.append("moveMappings", JSON.stringify({ moves }), { contentType: "application/json" });
            }
            await this.api.pushArchive(snapshot.packageKey, form, overwrite, snapshot.state.serverRevision);
            this.writeState(root, { ...snapshot.state, refreshRequired: true });
            try {
                const refreshedArchive = await this.api.download(snapshot.packageKey);
                this.refreshMetadata(root, refreshedArchive, snapshot.packageKey);
            } catch (error) {
                const detail = error instanceof GracefulError ? ` ${error.message}` : "";
                const failure = new GracefulError(
                    `Push succeeded, but local state refresh failed.${detail} Run workspace pull before retrying.`
                );
                failure.cause = error;
                throw failure;
            }
        } finally {
            fs.rmSync(zipPath, { force: true });
        }
        logger.info(`Pushed ${snapshot.packageKey}.`);
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
        const targetOwned = snapshot.expectedFiles.some(
            file => file.nodeKey !== tracked.nodeKey && file.path.toLowerCase() === targetPath.toLowerCase()
        );
        if (targetOwned) {
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
        snapshot.state.moveHints[tracked.nodeKey] = targetPath;
        this.writeState(root, snapshot.state);
        logger.info(`Moved: ${sourcePath} -> ${targetPath}`);
    }

    private snapshot(root: string): WorkspaceSnapshot {
        const packageKey = this.packageIdentity(root).packageKey;
        const state = this.state(root);
        if (state.refreshRequired) {
            throw new GracefulError("Workspace synchronization state needs refresh. Run workspace pull.");
        }
        const expectedFiles = this.expectedFiles(root, state, packageKey);
        const visibleFiles = this.visibleFiles(root);
        return {
            packageKey,
            state,
            expectedFiles,
            visibleFiles,
            changes: classifyWorkspaceChanges(expectedFiles, visibleFiles, state.moveHints),
        };
    }

    private expectedFiles(root: string, state: WorkspaceState, packageKey: string): ExpectedWorkspaceFile[] {
        const nodes = this.nodes(root);
        const byKey = new Map(nodes.map(node => [node.key, node]));
        const pathByKey = new Map<string, string>();
        const resolving = new Set<string>();
        const resolvePath = (node: WorkspaceNodeMetadata): string => {
            const cached = pathByKey.get(node.key);
            if (cached) {
                return cached;
            }
            if (resolving.has(node.key)) {
                throw new GracefulError(`Circular node hierarchy at ${node.key}.`);
            }
            resolving.add(node.key);
            const segment = this.filesystemName(node);
            let filePath = segment;
            if (node.parentNodeKey && node.parentNodeKey !== packageKey) {
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
                if (baseline && !/^sha256:[0-9a-f]{64}$/.test(baseline)) {
                    throw new GracefulError(`Invalid baseline digest for node ${node.key}.`);
                }
                return { nodeKey: node.key, path: resolvePath(node), digest: baseline };
            });
        const foldedPaths = new Set<string>();
        expected.forEach(file => {
            const foldedPath = file.path.toLowerCase();
            if (foldedPaths.has(foldedPath)) {
                throw new GracefulError(`Duplicate workspace path in node metadata: ${file.path}`);
            }
            foldedPaths.add(foldedPath);
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
                const node = JSON.parse(
                    fs.readFileSync(path.join(directory, entry.name), "utf-8")
                ) as WorkspaceNodeMetadata;
                const fields = node as unknown as Record<string, unknown>;
                if (
                    !node.key ||
                    !node.name ||
                    !node.type ||
                    `${node.key}.json` !== entry.name ||
                    NON_SEMANTIC_NODE_FIELDS.some(field => field in fields)
                ) {
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
                    if (
                        !relativeDirectory &&
                        (entry.name.toLowerCase() === ".pacman" || entry.name.toLowerCase() === ".git")
                    ) {
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
                    const foldedPath = validated.toLowerCase();
                    if (foldedPaths.has(foldedPath)) {
                        throw new GracefulError(`Workspace contains duplicate case-insensitive paths: ${validated}`);
                    }
                    foldedPaths.add(foldedPath);
                    files.set(validated, this.digest(absolute));
                });
        };
        visit(root, "");
        return files;
    }

    private trackedFile(snapshot: WorkspaceSnapshot, sourcePath: string): ExpectedWorkspaceFile | undefined {
        const foldedSourcePath = sourcePath.toLowerCase();
        const expected = snapshot.expectedFiles.find(file => file.path.toLowerCase() === foldedSourcePath);
        if (expected) {
            return expected;
        }
        const hinted = snapshot.expectedFiles.find(
            file => snapshot.state.moveHints[file.nodeKey]?.toLowerCase() === foldedSourcePath
        );
        if (hinted) {
            return hinted;
        }
        const classified = snapshot.changes.find(
            change =>
                change.path.toLowerCase() === foldedSourcePath &&
                change.nodeKey &&
                (change.status === "moved" || change.status === "moved, modified")
        );
        return classified ? snapshot.expectedFiles.find(file => file.nodeKey === classified.nodeKey) : undefined;
    }

    private refreshMetadata(root: string, download: { archive: Buffer; eTag: string }, packageKey: string): void {
        const extracted = this.validatedArchive(download, packageKey);
        try {
            this.replaceMetadataDirectory(root, path.join(extracted, ".pacman"));
        } finally {
            fs.rmSync(extracted, { recursive: true, force: true });
        }
    }

    private replaceMetadataDirectory(root: string, sourceMetadata: string): void {
        const refreshRoot = fs.mkdtempSync(path.join(path.dirname(root), `.${path.basename(root)}-pacman-refresh-`));
        const stagedMetadata = path.join(refreshRoot, "metadata");
        const previousMetadata = path.join(refreshRoot, "previous");
        const metadata = path.join(root, ".pacman");
        let preserveBackup = false;
        try {
            fs.cpSync(sourceMetadata, stagedMetadata, { recursive: true });
            fs.renameSync(metadata, previousMetadata);
            try {
                fs.renameSync(stagedMetadata, metadata);
            } catch (error) {
                try {
                    fs.renameSync(previousMetadata, metadata);
                } catch (restoreError) {
                    preserveBackup = true;
                    const failure = new GracefulError(
                        `Metadata refresh failed; workspace metadata backup remains at ${previousMetadata}.`
                    );
                    failure.cause = restoreError;
                    throw failure;
                }
                throw error;
            }
        } finally {
            if (!preserveBackup) {
                fs.rmSync(refreshRoot, { recursive: true, force: true });
            }
        }
    }

    private validatedArchive(download: { archive: Buffer; eTag: string }, packageKey: string): string {
        const zip = new AdmZip(download.archive);
        if (!zip.getEntry(".pacman/package.json") || !zip.getEntry(".pacman/.gitignore")) {
            throw new GracefulError("Archive does not contain Pacman package metadata.");
        }
        if (
            zip.getEntries().some(entry => {
                const folded = entry.entryName.toLowerCase();
                return folded === ".pacman/local" || folded.startsWith(".pacman/local/");
            })
        ) {
            throw new GracefulError("Archive contains local Pacman workspace state.");
        }
        const temporary = fileService.extractZipBufferToTempDirectory(download.archive);
        try {
            if (this.packageIdentity(temporary).packageKey !== packageKey) {
                throw new GracefulError("Archive package key does not match the requested package.");
            }
            this.validateGitignore(temporary);
            this.hydrateState(temporary, download.eTag);
            const snapshot = this.snapshot(temporary);
            if (snapshot.changes.length !== 0) {
                throw new GracefulError("Archive content does not match its workspace baseline.");
            }
            return temporary;
        } catch (error) {
            fs.rmSync(temporary, { recursive: true, force: true });
            throw error;
        }
    }

    private reconcileLocalState(root: string, remoteRoot: string): void {
        const packageKey = this.packageIdentity(root).packageKey;
        if (this.packageIdentity(remoteRoot).packageKey !== packageKey) {
            throw new GracefulError("Remote archive package key does not match this workspace.");
        }
        this.validateGitignore(root);
        const remoteState = this.state(remoteRoot);
        const emptyState: WorkspaceState = {
            schemaVersion: 1,
            serverRevision: remoteState.serverRevision,
            baselineDigests: remoteState.baselineDigests,
            moveHints: {},
        };
        const remoteFiles = new Map(
            this.expectedFiles(remoteRoot, emptyState, packageKey).map(file => [file.nodeKey, file])
        );
        const localFiles = this.expectedFiles(root, emptyState, packageKey);
        const remoteNodes = new Map(this.nodes(remoteRoot).map(node => [node.key, node]));
        this.nodes(root).forEach(node => {
            const remote = remoteNodes.get(node.key);
            if (remote && this.isFolder(remote) !== this.isFolder(node)) {
                throw new GracefulError(`Node metadata type conflicts with the server for ${node.key}.`);
            }
        });
        const moveHints = Object.fromEntries(
            localFiles
                .filter(file => remoteFiles.has(file.nodeKey) && remoteFiles.get(file.nodeKey)!.path !== file.path)
                .map(file => [file.nodeKey, file.path])
        );
        const reconciledState = { ...remoteState, moveHints };
        const expectedFiles = this.expectedFiles(root, reconciledState, packageKey);
        classifyWorkspaceChanges(expectedFiles, this.visibleFiles(root), moveHints);
        this.replaceMetadataDirectory(root, path.join(remoteRoot, ".pacman"));
        this.writeState(root, reconciledState);
    }

    private hydrateState(root: string, eTag: string): WorkspaceState {
        if (!/^"sha256:[0-9a-f]{64}"$/.test(eTag)) {
            throw new GracefulError("Filesystem archive response contains an invalid ETag.");
        }
        const packageKey = this.packageIdentity(root).packageKey;
        const emptyState: WorkspaceState = {
            schemaVersion: 1,
            serverRevision: eTag,
            baselineDigests: {},
            moveHints: {},
        };
        const baselineDigests = Object.fromEntries(
            this.expectedFiles(root, emptyState, packageKey).map(file => {
                const absolute = this.resolveVisiblePath(root, file.path);
                if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile()) {
                    throw new GracefulError(`Archive is missing visible content for node ${file.nodeKey}.`);
                }
                return [file.nodeKey, this.digest(absolute)];
            })
        );
        const state = { ...emptyState, baselineDigests };
        this.writeState(root, state);
        return state;
    }

    private replaceWorkspaceContents(root: string, source: string): void {
        if (root === path.parse(root).root) {
            throw new GracefulError("Cannot pull into the filesystem root.");
        }
        const parent = path.dirname(root);
        const backup = fs.mkdtempSync(path.join(parent, ".pacman-pull-backup-"));
        const staging = fs.mkdtempSync(path.join(parent, ".pacman-pull-"));
        let preserveBackup = false;
        fs.rmSync(staging, { recursive: true });
        try {
            fs.cpSync(source, staging, { recursive: true, force: false, errorOnExist: true });
            try {
                this.moveEntries(root, backup, new Set([".git"]));
            } catch (error) {
                try {
                    this.moveEntries(backup, root);
                } catch (restoreError) {
                    preserveBackup = true;
                    const failure = new GracefulError(`Pull failed; workspace backup remains at ${backup}.`);
                    failure.cause = restoreError;
                    throw failure;
                }
                throw error;
            }
            try {
                this.moveEntries(staging, root);
            } catch (error) {
                try {
                    fs.readdirSync(root)
                        .filter(entry => entry !== ".git")
                        .forEach(entry => fs.rmSync(path.join(root, entry), { recursive: true, force: true }));
                    this.moveEntries(backup, root);
                } catch (restoreError) {
                    preserveBackup = true;
                    const failure = new GracefulError(`Pull failed; workspace backup remains at ${backup}.`);
                    failure.cause = restoreError;
                    throw failure;
                }
                throw error;
            }
        } finally {
            fs.rmSync(staging, { recursive: true, force: true });
            if (!preserveBackup) {
                fs.rmSync(backup, { recursive: true, force: true });
            }
        }
    }

    private moveEntries(source: string, target: string, excluded: Set<string> = new Set()): void {
        fs.readdirSync(source)
            .filter(entry => !excluded.has(entry))
            .sort((left, right) => left.localeCompare(right))
            .forEach(entry => fs.renameSync(path.join(source, entry), path.join(target, entry)));
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
        while (!fs.existsSync(this.packageIdentityPath(current))) {
            const parent = path.dirname(current);
            if (parent === current) {
                throw new GracefulError("No Pacman workspace found.");
            }
            current = parent;
        }
        return current;
    }

    private state(root: string): WorkspaceState {
        if (!fs.existsSync(this.statePath(root))) {
            throw new GracefulError("Workspace synchronization state is missing. Run workspace pull.");
        }
        const parsed = JSON.parse(fs.readFileSync(this.statePath(root), "utf-8")) as Partial<WorkspaceState>;
        if (
            parsed.schemaVersion !== 1 ||
            !parsed.serverRevision ||
            !/^"sha256:[0-9a-f]{64}"$/.test(parsed.serverRevision) ||
            !parsed.baselineDigests ||
            typeof parsed.baselineDigests !== "object" ||
            Array.isArray(parsed.baselineDigests) ||
            !Object.values(parsed.baselineDigests).every(
                value => typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value)
            ) ||
            (parsed.moveHints !== undefined &&
                (typeof parsed.moveHints !== "object" ||
                    parsed.moveHints === null ||
                    Array.isArray(parsed.moveHints) ||
                    !Object.values(parsed.moveHints).every(value => typeof value === "string"))) ||
            (parsed.refreshRequired !== undefined && parsed.refreshRequired !== true)
        ) {
            throw new GracefulError("Unsupported Pacman workspace state.");
        }
        const state: WorkspaceState = {
            schemaVersion: parsed.schemaVersion,
            serverRevision: parsed.serverRevision,
            baselineDigests: parsed.baselineDigests,
            moveHints: parsed.moveHints || {},
        };
        if (parsed.refreshRequired) {
            state.refreshRequired = true;
        }
        return state;
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
            folded === ".git" ||
            folded.startsWith(".git/") ||
            normalized.startsWith("../") ||
            normalized.includes("/../") ||
            normalized.includes("/./")
        ) {
            throw new GracefulError(`Invalid workspace path: ${value}`);
        }
        return normalized;
    }

    private statePath(root: string): string {
        return path.join(root, ".pacman", "local", "state.json");
    }

    private writeState(root: string, state: WorkspaceState): void {
        fs.mkdirSync(path.dirname(this.statePath(root)), { recursive: true, mode: 0o700 });
        fs.writeFileSync(this.statePath(root), JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
    }

    private packageIdentity(root: string): WorkspacePackageIdentity {
        const parsed = JSON.parse(
            fs.readFileSync(this.packageIdentityPath(root), "utf-8")
        ) as Partial<WorkspacePackageIdentity>;
        if (parsed.schemaVersion !== 1 || !parsed.packageKey || Object.keys(parsed).length !== 2) {
            throw new GracefulError("Unsupported Pacman package metadata.");
        }
        return { schemaVersion: parsed.schemaVersion, packageKey: parsed.packageKey };
    }

    private packageIdentityPath(root: string): string {
        return path.join(root, ".pacman", "package.json");
    }

    private validateGitignore(root: string): void {
        const gitignore = path.join(root, ".pacman", ".gitignore");
        const content = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, "utf-8") : undefined;
        if (content !== "local/\n" && content !== "local/\r\n") {
            throw new GracefulError("Workspace .pacman/.gitignore must contain local/.");
        }
    }

    private digest(file: string): string {
        return `sha256:${createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
    }

    private isFolder(node: WorkspaceNodeMetadata): boolean {
        return node.type.toUpperCase() === "FOLDER";
    }
}
