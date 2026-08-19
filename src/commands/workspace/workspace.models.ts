export interface WorkspaceState {
    schemaVersion: number;
    serverRevision: string;
    baselineDigests: Record<string, string>;
    moveHints: Record<string, string>;
}

export interface WorkspacePackageIdentity {
    schemaVersion: number;
    packageKey: string;
}

export interface WorkspaceNodeMetadata {
    key: string;
    name: string;
    type: string;
    parentNodeKey?: string | null;
    filesystemName?: string;
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
    packageKey: string;
    state: WorkspaceState;
    expectedFiles: ExpectedWorkspaceFile[];
    visibleFiles: Map<string, string>;
    changes: ClassifiedWorkspaceChange[];
}
