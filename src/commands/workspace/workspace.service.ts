import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as FormData from "form-data";
import AdmZip = require("adm-zip");
import { Context } from "../../core/command/cli-context";
import { fileService } from "../../core/utils/file-service";
import { GracefulError, logger } from "../../core/utils/logger";
import { BranchUtils } from "../../core/utils/branches";
import { WorkspaceApi } from "./workspace-api";
import { classifyWorkspaceChanges } from "./workspace-change-classifier";
import { WorkspaceGitService } from "./workspace-git.service";
import { projectedLeafAfterMove, projectWorkspacePaths } from "./workspace-path-projector";
import { WorkspacePullService } from "./workspace-pull.service";
import { WorkspacePushService } from "./workspace-push.service";
import {
    ExpectedWorkspaceFile,
    WorkspaceChange,
    WorkspaceCheckoutOptions,
    WorkspaceCloneOptions,
    WorkspaceGitObservation,
    WorkspaceManifest,
    WorkspaceMoveHint,
    WorkspaceNodeMetadata,
    WorkspacePackageIdentity,
    WorkspacePullOptions,
    WorkspacePushOptions,
    WorkspacePushOutcome,
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
    "filesystemName",
];

export { WorkspaceChange } from "./workspace.models";

export class WorkspaceService {
    private readonly api: WorkspaceApi;

    constructor(
        context: Context,
        private readonly gitService: WorkspaceGitService = new WorkspaceGitService()
    ) {
        this.api = new WorkspaceApi(context);
    }

    public async clone(projectKey: string, directory?: string, options: WorkspaceCloneOptions = {}): Promise<void> {
        const branch = this.branch(options.branch);
        const packageKey = this.packageKey(projectKey, branch);
        const target = path.resolve(process.cwd(), directory || projectKey);
        if (fs.existsSync(target)) {
            throw new GracefulError(`Destination already exists: ${target}`);
        }
        const temporary = this.validatedArchive(await this.api.download(packageKey), packageKey, projectKey);
        const parent = path.dirname(target);
        let staging: string | undefined;
        try {
            fs.mkdirSync(parent, { recursive: true });
            staging = fs.mkdtempSync(path.join(parent, ".package-clone-"));
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

    public async checkout(branchValue: string, options: WorkspaceCheckoutOptions = {}): Promise<void> {
        const root = this.root();
        const projectKey = this.packageIdentity(root).projectKey;
        const branch = this.branch(branchValue);
        const hasLocalState = fs.existsSync(this.statePath(root));
        const current = hasLocalState ? this.state(root) : undefined;
        const packageKey = options.create
            ? await this.createWorkspaceBranch(current, projectKey, branch)
            : this.packageKey(projectKey, branch);
        if (options.linkGit) {
            const observation = await this.linkCurrentGitBranch(root, projectKey, branch);
            const base: WorkspaceState = current || {
                schemaVersion: 1,
                activePackageKey: packageKey,
                activeBranch: branch,
                baselineDigests: {},
                moveHints: {},
            };
            await this.hydrateGitBaseline(root, { ...base, git: observation }, packageKey, branch, observation);
            logger.info(`${options.create ? "Created and selected" : "Selected"} ${packageKey}.`);
            return;
        }
        const download = await this.api.download(packageKey);
        const temporary = this.validatedArchive(download, packageKey, projectKey);
        try {
            await this.applyCheckout(root, temporary, packageKey, projectKey, branch, current, options);
        } finally {
            fs.rmSync(temporary, { recursive: true, force: true });
        }
        logger.info(`${options.create ? "Created and selected" : "Selected"} ${packageKey}.`);
    }

    public async pull(paths: string[] = [], options: WorkspacePullOptions = {}): Promise<void> {
        if (options.full) {
            if (paths.length > 0) {
                throw new GracefulError("Workspace paths cannot be combined with --full.");
            }
            await this.pullFull();
            return;
        }
        const root = this.root();
        const projectKey = this.packageIdentity(root).projectKey;
        const hasLocalState = fs.existsSync(this.statePath(root));
        if (hasLocalState) {
            const reconciled = await this.synchronizeGitTarget(root, false);
            if (reconciled) {
                logger.info(`Pulled ${this.state(root).activePackageKey}.`);
                return;
            }
        }
        let localState = hasLocalState ? this.state(root) : undefined;
        const recoveringCreateKeys = Boolean(localState?.refreshRequired);
        if (localState?.serverRevision) {
            localState = { ...localState };
            delete localState.serverRevision;
            this.writeState(root, localState);
        }
        const { packageKey, restoredObservation } = await this.pullTarget(root, projectKey, localState);
        const remote = await this.api.manifest(packageKey);
        if (localState?.refreshRequired) {
            localState = { ...localState };
            delete localState.refreshRequired;
            this.writeState(root, localState);
        }
        const pullService = new WorkspacePullService(this.api);
        if (!localState) {
            const initial: WorkspaceState = {
                schemaVersion: 1,
                activePackageKey: packageKey,
                activeBranch: this.branchFromPackageKey(projectKey, packageKey),
                baselineDigests: {},
                moveHints: {},
            };
            if (restoredObservation) {
                initial.git = restoredObservation;
            }
            this.writeState(
                root,
                this.withRemotePathHints(
                    root,
                    pullService.hydrateBaseline(initial, packageKey, initial.activeBranch, remote.manifest),
                    remote.manifest
                )
            );
            logger.info(`Pulled ${packageKey}.`);
            return;
        }
        const result = await pullService.pull(
            root,
            this.snapshot(root),
            this.nodes(root),
            paths,
            remote.manifest,
            recoveringCreateKeys
        );
        if (recoveringCreateKeys && paths.length > 0) {
            result.state.refreshRequired = true;
        }
        this.writeState(root, result.state);
        result.outcomes.forEach(outcome =>
            logger.info(
                `${outcome.success ? "succeeded" : "failed"}: ${outcome.status} ${outcome.path}` +
                    (outcome.error ? ` (${outcome.error})` : "")
            )
        );
        const failed = result.outcomes.filter(outcome => !outcome.success);
        if (failed.length > 0) {
            throw new GracefulError(`Workspace pull failed for ${failed.length} node(s).`);
        }
        logger.info(`Pulled ${packageKey}.`);
    }

    private async pullFull(): Promise<void> {
        const root = this.root();
        await this.synchronizeGitTarget(root, false);
        const state = this.state(root);
        const projectKey = this.packageIdentity(root).projectKey;
        if (!state.refreshRequired && this.snapshot(root).changes.length !== 0) {
            throw new GracefulError("Workspace has local changes. Push or discard them before full pull.");
        }
        const temporary = this.validatedArchive(
            await this.api.download(state.activePackageKey),
            state.activePackageKey,
            projectKey,
            state.git
        );
        try {
            this.replaceWorkspaceContents(root, temporary);
        } finally {
            fs.rmSync(temporary, { recursive: true, force: true });
        }
        logger.info(`Pulled ${state.activePackageKey}.`);
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

    public async statusWithGit(directory?: string): Promise<WorkspaceChange[]> {
        const root = this.root(directory);
        await this.synchronizeGitTarget(root, false);
        return this.status(root);
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
        await this.synchronizeGitTarget(root, true);
        const snapshot = this.snapshot(root);
        const invalidatedBeforePush: WorkspaceState = { ...snapshot.state };
        delete invalidatedBeforePush.serverRevision;
        this.writeState(root, invalidatedBeforePush);
        const outcomes: WorkspacePushOutcome[] = await new WorkspacePushService(this.api).push(root, snapshot, paths);
        outcomes.forEach(outcome =>
            logger.info(
                `${outcome.success ? "succeeded" : "failed"}: ${outcome.status} ${outcome.path}` +
                    (outcome.error ? ` (${outcome.error})` : "")
            )
        );
        const failed = outcomes.filter(outcome => !outcome.success);
        const remoteChanged = outcomes.some(outcome => outcome.remoteChanged);
        const retainedHints = this.retainedMoveHints(snapshot.state.moveHints, outcomes);
        const invalidatedState: WorkspaceState = {
            ...snapshot.state,
            moveHints: retainedHints,
        };
        delete invalidatedState.serverRevision;
        delete invalidatedState.refreshRequired;
        if (!remoteChanged) {
            this.writeState(root, invalidatedState);
            if (failed.length > 0) {
                throw new GracefulError(`Workspace push failed for ${failed.length} file(s).`);
            }
            logger.info(paths.length > 0 ? "Selected paths have no changes." : "Workspace is clean.");
            return;
        }
        try {
            const remote = await this.api.manifest(snapshot.packageKey);
            this.writeState(
                root,
                new WorkspacePullService(this.api).applyPushResults(root, invalidatedState, remote.manifest, outcomes)
            );
        } catch (error) {
            this.writeState(root, { ...invalidatedState, refreshRequired: true });
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
        await this.synchronizeGitTarget(root, true);
        const snapshot = this.snapshot(root);
        if (snapshot.changes.some(change => change.status === "unresolved")) {
            throw new GracefulError("Workspace has unresolved file identities. Record the intended moves before push.");
        }
        const zipPath = fileService.zipDirectoryAsSinglePackage(root, filePath => {
            const folded = filePath.toLowerCase();
            return (
                folded !== ".git" &&
                !folded.startsWith(".git/") &&
                folded !== ".package/local" &&
                !folded.startsWith(".package/local/")
            );
        });
        try {
            if (!snapshot.state.serverRevision) {
                throw new GracefulError("A full push requires a revision from workspace pull --full.");
            }
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
            const pendingRefresh: WorkspaceState = { ...snapshot.state, refreshRequired: true };
            delete pendingRefresh.serverRevision;
            this.writeState(root, pendingRefresh);
            try {
                const refreshedArchive = await this.api.download(snapshot.packageKey);
                this.refreshMetadata(
                    root,
                    refreshedArchive,
                    snapshot.packageKey,
                    snapshot.projectKey,
                    snapshot.state.git
                );
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
        this.validateParentMove(root, snapshot, tracked, targetPath);
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
        const projectKey = this.packageIdentity(root).projectKey;
        const state = this.state(root);
        if (state.refreshRequired) {
            throw new GracefulError("Workspace synchronization state needs refresh. Run workspace pull.");
        }
        if (BranchUtils.extractProjectKey(state.activePackageKey) !== projectKey) {
            throw new GracefulError("Active Pacman package does not belong to this workspace project.");
        }
        const expectedFiles = this.expectedFiles(root, state, state.activePackageKey);
        const visibleFiles = this.visibleFiles(root);
        return {
            projectKey,
            packageKey: state.activePackageKey,
            state,
            expectedFiles,
            visibleFiles,
            changes: classifyWorkspaceChanges(expectedFiles, visibleFiles, this.moveHintTargets(state.moveHints)),
        };
    }

    private expectedFiles(root: string, state: WorkspaceState, packageKey: string): ExpectedWorkspaceFile[] {
        const nodes = this.nodes(root);
        const byKey = new Map(nodes.map(node => [node.key, node]));
        const pathByKey = projectWorkspacePaths(nodes, packageKey);
        const expected = nodes
            .filter(node => !this.isFolder(node))
            .map(node => {
                const baseline = state.baselineDigests[node.key];
                if (baseline && !/^sha256:[0-9a-f]{64}$/.test(baseline)) {
                    throw new GracefulError(`Invalid baseline digest for node ${node.key}.`);
                }
                const metadataPath = pathByKey.get(node.key)!;
                const hint = state.moveHints[node.key];
                const sourcePath = this.isStructuredMoveHint(hint)
                    ? this.validateRelative(hint.sourcePath)
                    : metadataPath;
                return { nodeKey: node.key, path: sourcePath, digest: baseline };
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
            if (this.isStructuredMoveHint(targetPath)) {
                state.moveHints[nodeKey] = {
                    sourcePath: this.validateRelative(targetPath.sourcePath),
                    targetPath: this.validateRelative(targetPath.targetPath),
                };
            } else {
                state.moveHints[nodeKey] = this.validateRelative(targetPath);
            }
        });
        return expected.sort((left, right) => left.path.localeCompare(right.path));
    }

    private nodes(root: string): WorkspaceNodeMetadata[] {
        const directory = path.join(root, ".package", "nodes");
        if (!fs.existsSync(directory)) {
            throw new GracefulError("Workspace does not contain .package/nodes metadata.");
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
                    NON_SEMANTIC_NODE_FIELDS.some(field => field in fields) ||
                    this.hasLegacyFilesystemName(node)
                ) {
                    throw new GracefulError(`Invalid node metadata file: ${entry.name}`);
                }
                return node;
            });
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
                        (entry.name.toLowerCase() === ".package" || entry.name.toLowerCase() === ".git")
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
            file => this.moveHintTarget(snapshot.state.moveHints[file.nodeKey])?.toLowerCase() === foldedSourcePath
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

    private validateParentMove(
        root: string,
        snapshot: WorkspaceSnapshot,
        tracked: ExpectedWorkspaceFile,
        targetPath: string
    ): void {
        const currentLeaf = path.posix.basename(tracked.path);
        if (path.posix.basename(targetPath) !== currentLeaf) {
            throw new GracefulError("Filename-only rename is not supported; move the Node to another parent.");
        }
        const nodes = this.nodes(root);
        const paths = projectWorkspacePaths(nodes, snapshot.packageKey);
        const targetParentPath = path.posix.dirname(targetPath) === "." ? "" : path.posix.dirname(targetPath);
        const targetParent = nodes.find(node => this.isFolder(node) && paths.get(node.key) === targetParentPath);
        const targetParentKey = targetParentPath
            ? targetParent?.key || `__workspace_target__:${targetParentPath}`
            : undefined;
        if (projectedLeafAfterMove(nodes, tracked.nodeKey, targetParentKey, snapshot.packageKey) !== currentLeaf) {
            throw new GracefulError("This parent move would change the Node's derived filename.");
        }
    }

    private hasLegacyFilesystemName(node: WorkspaceNodeMetadata): boolean {
        const fields = node as unknown as Record<string, unknown>;
        return (
            "filesystemName" in fields ||
            Boolean(node.metadata && "filesystemName" in node.metadata) ||
            Boolean(node.additionalFields && "filesystemName" in node.additionalFields)
        );
    }

    private refreshMetadata(
        root: string,
        download: { archive: Buffer; eTag: string },
        packageKey: string,
        projectKey: string,
        observation?: WorkspaceGitObservation
    ): void {
        const extracted = this.validatedArchive(download, packageKey, projectKey, observation);
        try {
            this.replaceMetadataDirectory(root, path.join(extracted, ".package"));
        } finally {
            fs.rmSync(extracted, { recursive: true, force: true });
        }
    }

    private replaceMetadataDirectory(root: string, sourceMetadata: string): void {
        const refreshRoot = fs.mkdtempSync(path.join(path.dirname(root), `.${path.basename(root)}-pacman-refresh-`));
        const stagedMetadata = path.join(refreshRoot, "metadata");
        const previousMetadata = path.join(refreshRoot, "previous");
        const metadata = path.join(root, ".package");
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

    private validatedArchive(
        download: { archive: Buffer; eTag: string },
        packageKey: string,
        projectKey: string = BranchUtils.extractProjectKey(packageKey),
        observation?: WorkspaceGitObservation
    ): string {
        const zip = new AdmZip(download.archive);
        if (!zip.getEntry(".package/package.json") || !zip.getEntry(".package/.gitignore")) {
            throw new GracefulError("Archive does not contain Pacman package metadata.");
        }
        if (
            zip.getEntries().some(entry => {
                const folded = entry.entryName.toLowerCase();
                return folded === ".package/local" || folded.startsWith(".package/local/");
            })
        ) {
            throw new GracefulError("Archive contains local Pacman workspace state.");
        }
        const temporary = fileService.extractZipBufferToTempDirectory(download.archive);
        try {
            if (this.packageIdentity(temporary).projectKey !== projectKey) {
                throw new GracefulError("Archive project key does not match the requested project.");
            }
            this.validateGitignore(temporary);
            this.hydrateState(temporary, download.eTag, packageKey, observation);
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

    private reconcileLocalState(
        root: string,
        remoteRoot: string,
        packageKey: string,
        branch: string,
        observation?: WorkspaceGitObservation
    ): void {
        const projectKey = this.packageIdentity(root).projectKey;
        if (this.packageIdentity(remoteRoot).projectKey !== projectKey) {
            throw new GracefulError("Remote archive project key does not match this workspace.");
        }
        this.validateGitignore(root);
        const remoteState = this.state(remoteRoot);
        const emptyState: WorkspaceState = {
            schemaVersion: 1,
            activePackageKey: packageKey,
            activeBranch: branch,
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
        const moveHints: Record<string, WorkspaceMoveHint> = Object.fromEntries(
            localFiles
                .filter(file => remoteFiles.has(file.nodeKey) && remoteFiles.get(file.nodeKey)!.path !== file.path)
                .map(file => [file.nodeKey, { sourcePath: remoteFiles.get(file.nodeKey)!.path, targetPath: file.path }])
        );
        const reconciledState: WorkspaceState = {
            ...remoteState,
            activePackageKey: packageKey,
            activeBranch: branch,
            moveHints,
        };
        if (observation) {
            reconciledState.git = observation;
        } else {
            delete reconciledState.git;
        }
        const expectedFiles = this.expectedFiles(root, reconciledState, packageKey);
        classifyWorkspaceChanges(expectedFiles, this.visibleFiles(root), this.moveHintTargets(moveHints));
        this.writeState(root, reconciledState);
    }

    private hydrateState(
        root: string,
        eTag: string,
        packageKey: string,
        observation?: WorkspaceGitObservation
    ): WorkspaceState {
        if (!/^"sha256:[0-9a-f]{64}"$/.test(eTag)) {
            throw new GracefulError("Filesystem archive response contains an invalid ETag.");
        }
        const projectKey = this.packageIdentity(root).projectKey;
        if (BranchUtils.extractProjectKey(packageKey) !== projectKey) {
            throw new GracefulError("Active Pacman package does not belong to the archive project.");
        }
        const emptyState: WorkspaceState = {
            schemaVersion: 1,
            activePackageKey: packageKey,
            activeBranch: this.branchFromPackageKey(projectKey, packageKey),
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
        const state: WorkspaceState = { ...emptyState, baselineDigests };
        if (observation) {
            state.git = observation;
        }
        this.writeState(root, state);
        return state;
    }

    private replaceWorkspaceContents(root: string, source: string): void {
        if (root === path.parse(root).root) {
            throw new GracefulError("Cannot pull into the filesystem root.");
        }
        const parent = path.dirname(root);
        const backup = fs.mkdtempSync(path.join(parent, ".package-pull-backup-"));
        const staging = fs.mkdtempSync(path.join(parent, ".package-pull-"));
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
            !parsed.activePackageKey ||
            !parsed.activeBranch ||
            (parsed.serverRevision !== undefined && !/^"sha256:[0-9a-f]{64}"$/.test(parsed.serverRevision)) ||
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
                    !Object.values(parsed.moveHints).every(
                        value => typeof value === "string" || this.isStructuredMoveHint(value)
                    ))) ||
            (parsed.git !== undefined &&
                (!parsed.git ||
                    typeof parsed.git !== "object" ||
                    typeof parsed.git.branch !== "string" ||
                    typeof parsed.git.head !== "string" ||
                    !/^[0-9a-f]{40,64}$/.test(parsed.git.head))) ||
            (parsed.refreshRequired !== undefined && parsed.refreshRequired !== true)
        ) {
            throw new GracefulError("Unsupported Pacman workspace state.");
        }
        const state: WorkspaceState = {
            schemaVersion: parsed.schemaVersion,
            activePackageKey: parsed.activePackageKey,
            activeBranch: parsed.activeBranch,
            baselineDigests: parsed.baselineDigests,
            moveHints: parsed.moveHints || {},
        };
        if (parsed.serverRevision) {
            state.serverRevision = parsed.serverRevision;
        }
        if (parsed.refreshRequired) {
            state.refreshRequired = true;
        }
        if (parsed.git) {
            state.git = parsed.git;
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
            folded === ".package" ||
            folded.startsWith(".package/") ||
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

    private moveHintTargets(hints: Record<string, string | WorkspaceMoveHint>): Record<string, string> {
        return Object.fromEntries(
            Object.entries(hints).map(([nodeKey, hint]) => [nodeKey, this.moveHintTarget(hint)!])
        );
    }

    private moveHintTarget(hint: string | WorkspaceMoveHint | undefined): string | undefined {
        return this.isStructuredMoveHint(hint) ? hint.targetPath : hint;
    }

    private isStructuredMoveHint(value: unknown): value is WorkspaceMoveHint {
        return Boolean(
            value &&
                typeof value === "object" &&
                !Array.isArray(value) &&
                typeof (value as WorkspaceMoveHint).sourcePath === "string" &&
                typeof (value as WorkspaceMoveHint).targetPath === "string" &&
                Object.keys(value).length === 2
        );
    }

    private retainedMoveHints(
        hints: Record<string, string | WorkspaceMoveHint>,
        outcomes: WorkspacePushOutcome[]
    ): Record<string, string | WorkspaceMoveHint> {
        const completedNodeKeys = new Set(
            outcomes
                .filter(outcome => outcome.success || outcome.remoteChanged)
                .flatMap(outcome => (outcome.nodeKey ? [outcome.nodeKey] : []))
        );
        const retained = Object.fromEntries(
            Object.entries(hints).filter(([nodeKey]) => !completedNodeKeys.has(nodeKey))
        );
        outcomes
            .filter(
                outcome =>
                    !outcome.success &&
                    !outcome.remoteChanged &&
                    outcome.nodeKey &&
                    (outcome.status === "moved" || outcome.status === "moved, modified")
            )
            .forEach(outcome => {
                retained[outcome.nodeKey!] ||= hints[outcome.nodeKey!] || outcome.path;
            });
        return retained;
    }

    private statePath(root: string): string {
        return path.join(root, ".package", "local", "state.json");
    }

    private async createWorkspaceBranch(
        current: WorkspaceState | undefined,
        projectKey: string,
        branch: string
    ): Promise<string> {
        if (!current) {
            throw new GracefulError("Workspace synchronization state is missing. Select an existing branch first.");
        }
        if (branch === BranchUtils.MAIN_BRANCH_KEY) {
            throw new GracefulError("The main branch already exists.");
        }
        const created = await this.api.createBranch(current.activePackageKey, branch);
        if (created.projectKey !== projectKey || created.branchKey !== branch) {
            throw new GracefulError("Created branch does not belong to this workspace project.");
        }
        return created.packageKey;
    }

    private async applyCheckout(
        root: string,
        temporary: string,
        packageKey: string,
        projectKey: string,
        branch: string,
        current: WorkspaceState | undefined,
        options: WorkspaceCheckoutOptions
    ): Promise<void> {
        if (options.create || options.linkGit) {
            const observation = options.linkGit ? await this.linkCurrentGitBranch(root, projectKey, branch) : undefined;
            this.reconcileLocalState(root, temporary, packageKey, branch, observation);
            return;
        }
        if (!options.discard && (!current || this.snapshot(root).changes.length !== 0)) {
            throw new GracefulError("Workspace has local changes. Use --discard or push them before checkout.");
        }
        this.replaceWorkspaceContents(root, temporary);
    }

    private async pullTarget(
        root: string,
        projectKey: string,
        localState: WorkspaceState | undefined
    ): Promise<{ packageKey: string; restoredObservation?: WorkspaceGitObservation }> {
        if (localState) {
            return { packageKey: localState.activePackageKey };
        }
        const restoredObservation = await this.gitService.observe(root);
        if (!restoredObservation) {
            return { packageKey: projectKey };
        }
        if (!restoredObservation.branch) {
            throw new GracefulError("Detached Git HEAD cannot select a Pacman workspace branch.");
        }
        const mappedBranch = await this.gitService.mappedPacmanBranch(root, projectKey, restoredObservation.branch);
        if (!mappedBranch) {
            throw new GracefulError(
                `Git branch '${restoredObservation.branch}' is not mapped. Use workspace checkout --link-git.`
            );
        }
        return {
            packageKey: this.packageKey(projectKey, this.branch(mappedBranch)),
            restoredObservation,
        };
    }

    private async synchronizeGitTarget(root: string, requirePushSafe: boolean): Promise<boolean> {
        const state = this.state(root);
        const observation = await this.gitService.observe(root);
        if (!state.git) {
            return this.handleUnlinkedGit(observation, requirePushSafe);
        }
        if (!observation) {
            return this.handleUnsafeGitState(
                requirePushSafe,
                "The linked Git worktree is unavailable; workspace push is blocked.",
                "The linked Git worktree is unavailable; using the last Pacman baseline."
            );
        }
        if (observation.branch === state.git.branch) {
            if (observation.head !== state.git.head) {
                this.writeState(root, { ...state, git: observation });
                logger.info(`Observed Git branch '${observation.branch}' at ${observation.head}.`);
            }
            return false;
        }
        if (!observation.branch) {
            return this.handleUnsafeGitState(
                requirePushSafe,
                "Detached Git HEAD cannot push a Pacman workspace.",
                "Git HEAD is detached; using the last Pacman baseline."
            );
        }
        const projectKey = this.packageIdentity(root).projectKey;
        const mappedBranch = await this.gitService.mappedPacmanBranch(root, projectKey, observation.branch);
        if (!mappedBranch) {
            return this.handleUnsafeGitState(
                requirePushSafe,
                `Git branch '${observation.branch}' is not mapped to a Pacman branch. Use workspace checkout --link-git.`,
                `Git branch '${observation.branch}' is not mapped; using the last Pacman baseline.`
            );
        }
        const branch = this.branch(mappedBranch);
        const packageKey = this.packageKey(projectKey, branch);
        await this.hydrateGitBaseline(root, { ...state, git: observation }, packageKey, branch, observation);
        logger.info(`Reconciled Git branch '${observation.branch}' with ${packageKey}.`);
        return true;
    }

    private async hydrateGitBaseline(
        root: string,
        state: WorkspaceState,
        packageKey: string,
        branch: string,
        observation: WorkspaceGitObservation
    ): Promise<void> {
        const remote = await this.api.manifest(packageKey);
        const localByKey = new Map(this.nodes(root).map(node => [node.key, node]));
        remote.manifest.nodes.forEach(entry => {
            const local = localByKey.get(entry.nodeKey);
            if (local && this.isFolder(local) !== (entry.kind === "folder")) {
                throw new GracefulError(`Node metadata type conflicts with the server for ${entry.nodeKey}.`);
            }
        });
        this.writeState(
            root,
            this.withRemotePathHints(
                root,
                new WorkspacePullService(this.api).hydrateBaseline(
                    { ...state, git: observation },
                    packageKey,
                    branch,
                    remote.manifest
                ),
                remote.manifest
            )
        );
    }

    private withRemotePathHints(root: string, state: WorkspaceState, manifest: WorkspaceManifest): WorkspaceState {
        const remotePathByNodeKey = new Map(
            manifest.nodes.filter(entry => entry.kind === "file").map(entry => [entry.nodeKey, entry.path])
        );
        const moveHints: Record<string, WorkspaceMoveHint> = Object.fromEntries(
            this.expectedFiles(root, state, state.activePackageKey)
                .filter(file => {
                    const remotePath = remotePathByNodeKey.get(file.nodeKey);
                    return remotePath && remotePath.toLowerCase() !== file.path.toLowerCase();
                })
                .map(file => [
                    file.nodeKey,
                    { sourcePath: remotePathByNodeKey.get(file.nodeKey)!, targetPath: file.path },
                ])
        );
        return { ...state, moveHints };
    }

    private handleUnlinkedGit(observation: WorkspaceGitObservation | undefined, requirePushSafe: boolean): boolean {
        if (requirePushSafe && observation) {
            const detail = observation.branch ? `Git branch '${observation.branch}'` : "Detached Git HEAD";
            throw new GracefulError(`${detail} is not linked to a Pacman branch. Use workspace checkout --link-git.`);
        }
        return false;
    }

    private handleUnsafeGitState(requirePushSafe: boolean, error: string, warning: string): boolean {
        if (requirePushSafe) {
            throw new GracefulError(error);
        }
        logger.warn(warning);
        return false;
    }

    private async linkCurrentGitBranch(
        root: string,
        projectKey: string,
        pacmanBranch: string
    ): Promise<WorkspaceGitObservation> {
        const observation = await this.gitService.observe(root);
        if (!observation) {
            throw new GracefulError("Workspace is not inside a Git worktree.");
        }
        if (!observation.branch) {
            throw new GracefulError("Detached Git HEAD cannot be linked to a Pacman branch.");
        }
        return this.gitService.link(root, projectKey, observation.branch, pacmanBranch);
    }

    private branch(value?: string): string {
        const branch = (value || BranchUtils.MAIN_BRANCH_KEY).trim();
        if (!branch || branch.includes("@") || /[\u0000-\u001f\u007f]/.test(branch)) {
            throw new GracefulError(`Invalid Pacman branch: ${value || ""}`);
        }
        return branch.toLowerCase() === BranchUtils.MAIN_BRANCH_KEY ? BranchUtils.MAIN_BRANCH_KEY : branch;
    }

    private packageKey(projectKey: string, branch: string): string {
        return branch === BranchUtils.MAIN_BRANCH_KEY ? projectKey : BranchUtils.constructBranchKey(projectKey, branch);
    }

    private branchFromPackageKey(projectKey: string, packageKey: string): string {
        if (packageKey === projectKey) {
            return BranchUtils.MAIN_BRANCH_KEY;
        }
        const prefix = `${projectKey}@`;
        if (!packageKey.startsWith(prefix)) {
            throw new GracefulError("Active Pacman package does not belong to this workspace project.");
        }
        return this.branch(packageKey.slice(prefix.length));
    }

    private writeState(root: string, state: WorkspaceState): void {
        fs.mkdirSync(path.dirname(this.statePath(root)), { recursive: true, mode: 0o700 });
        fs.writeFileSync(this.statePath(root), JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
    }

    private packageIdentity(root: string): WorkspacePackageIdentity {
        const parsed = JSON.parse(
            fs.readFileSync(this.packageIdentityPath(root), "utf-8")
        ) as Partial<WorkspacePackageIdentity>;
        if (parsed.schemaVersion !== 1 || !parsed.projectKey || Object.keys(parsed).length !== 2) {
            throw new GracefulError("Unsupported Pacman package metadata.");
        }
        return { schemaVersion: parsed.schemaVersion, projectKey: parsed.projectKey };
    }

    private packageIdentityPath(root: string): string {
        return path.join(root, ".package", "package.json");
    }

    private validateGitignore(root: string): void {
        const gitignore = path.join(root, ".package", ".gitignore");
        const content = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, "utf-8") : undefined;
        if (content !== "local/\n" && content !== "local/\r\n") {
            throw new GracefulError("Workspace .package/.gitignore must contain local/.");
        }
    }

    private digest(file: string): string {
        return `sha256:${createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
    }

    private isFolder(node: WorkspaceNodeMetadata): boolean {
        return node.type.toUpperCase() === "FOLDER";
    }
}
