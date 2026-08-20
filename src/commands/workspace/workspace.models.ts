export interface WorkspaceState {
    schemaVersion: number;
    activePackageKey: string;
    activeBranch: string;
    serverRevision?: string;
    baselineDigests: Record<string, string>;
    moveHints: Record<string, string | WorkspaceMoveHint>;
    git?: WorkspaceGitObservation;
    refreshRequired?: boolean;
}

export interface WorkspaceMoveHint {
    sourcePath: string;
    targetPath: string;
}

export interface WorkspacePackageIdentity {
    schemaVersion: number;
    projectKey: string;
}

export interface WorkspaceGitObservation {
    branch: string;
    head: string;
}

export interface WorkspaceCloneOptions {
    branch?: string;
}

export interface WorkspaceCheckoutOptions {
    create?: boolean;
    discard?: boolean;
    linkGit?: boolean;
}

export interface WorkspaceBranch {
    projectKey: string;
    branchKey: string;
    packageKey: string;
}

export interface WorkspaceNodeMetadata {
    key: string;
    name: string;
    type: string;
    parentNodeKey?: string | null;
    schemaVersion?: number;
    serializedDocumentRef?: string;
    dependenciesConfiguration?: unknown;
    metadata?: Record<string, unknown>;
    additionalFields?: Record<string, unknown>;
}

export interface ExpectedWorkspaceFile {
    nodeKey: string;
    path: string;
    digest?: string;
}

export type WorkspaceChangeStatus = "added" | "deleted" | "modified" | "moved" | "moved, modified" | "unresolved";

export interface WorkspaceChange {
    path: string;
    status: WorkspaceChangeStatus;
}

export interface ClassifiedWorkspaceChange extends WorkspaceChange {
    nodeKey?: string;
}

export interface WorkspaceSnapshot {
    projectKey: string;
    packageKey: string;
    state: WorkspaceState;
    expectedFiles: ExpectedWorkspaceFile[];
    visibleFiles: Map<string, string>;
    changes: ClassifiedWorkspaceChange[];
}

export interface WorkspacePushOptions {
    full?: boolean;
    overwrite?: boolean;
}

export interface WorkspacePullOptions {
    full?: boolean;
}

export interface WorkspaceManifest {
    nodes: WorkspaceManifestNode[];
    documents: Record<string, string>;
}

export interface WorkspaceManifestNode {
    nodeKey: string;
    path: string;
    kind: "file" | "folder";
    assetType?: string | null;
    mediaType?: string | null;
    size?: number | null;
    contentDigest?: string | null;
    eTag?: string | null;
    metadata: WorkspaceNodeMetadata;
}

export type WorkspacePullStatus = "added" | "deleted" | "modified" | "moved" | "conflict";

export interface WorkspacePullOutcome {
    path: string;
    status: WorkspacePullStatus;
    nodeKey: string;
    success: boolean;
    error?: string;
}

export interface WorkspacePushOutcome {
    path: string;
    status: WorkspaceChangeStatus;
    nodeKey?: string;
    localNodeKey?: string;
    success: boolean;
    remoteChanged?: boolean;
    error?: string;
}

export interface NodeFileWriteResponse {
    path: string;
    nodeKey: string;
    assetType: string;
    eTag: string;
}
