export enum MergeResolution {
    CUSTOM = "CUSTOM",
    ACCEPT_SOURCE = "ACCEPT_SOURCE",
    ACCEPT_TARGET = "ACCEPT_TARGET",
}

export enum MergeStatus {
    UNKNOWN = "UNKNOWN",
    UNCHANGED = "UNCHANGED",
    SOURCE_ONLY = "SOURCE_ONLY",
    TARGET_ONLY = "TARGET_ONLY",
    AUTO_MERGE = "AUTO_MERGE",
    CONFLICT = "CONFLICT",
}

export enum ChangeType {
    UNKNOWN = "UNKNOWN",
    ADDED = "ADDED",
    DELETED = "DELETED",
    CHANGED = "CHANGED",
    UNCHANGED = "UNCHANGED",
}

export enum VersionBumpOption {
    NONE = "NONE",
    PATCH = "PATCH",
    MINOR = "MINOR",
    MAJOR = "MAJOR",
}

export interface BranchingSettingsTransport {
    branchingEnabled: boolean;
}

export interface CreateBranchTransport {
    branchKey: string;
    version: string;
}

export interface BranchTransport {
    projectKey: string;
    branchKey: string;
    sourcePackageKey: string;
    sourceVersion: string;
    packageKey: string;
    packageId?: string;
}

export interface ConfigurationChangeTransport {
    op: string;
    path: string;
    from?: string;
    value?: unknown;
    fromValue?: unknown;
}

export interface MergePackageResolutionTransport {
    resolution: MergeResolution;
    customConfigurationChanges?: ConfigurationChangeTransport[];
    customMetadataChanges?: ConfigurationChangeTransport[];
}

export interface MergeNodeResolutionTransport {
    nodeKey: string;
    resolution: MergeResolution;
    customConfigurationChanges?: ConfigurationChangeTransport[];
    customMetadataChanges?: ConfigurationChangeTransport[];
}

export interface NodeFilterTransport {
    nodeKeys?: string[];
}

export interface SavePackageVersionTransport {
    version?: string | null;
    versionBumpOption?: VersionBumpOption;
    summaryOfChanges?: string;
    nodeFilter?: NodeFilterTransport | null;
}

export interface MergePreviewRequestTransport {
    sourceKey: string;
    sourceVersion: string;
}

export interface MergeBranchTransport {
    sourceKey: string;
    sourceVersion: string;
    resolvedPackageConflict?: MergePackageResolutionTransport | null;
    resolvedNodeConflicts?: MergeNodeResolutionTransport[];
    versionCreate: SavePackageVersionTransport;
}

export interface MergePathConflictTransport {
    path: string;
    sourceChange: ConfigurationChangeTransport;
    targetChange: ConfigurationChangeTransport;
}

export interface MergeDiffDetailTransport {
    status: MergeStatus;
    sourceChanges: ConfigurationChangeTransport[];
    targetChanges: ConfigurationChangeTransport[];
    conflicts: MergePathConflictTransport[];
    autoMergedChanges: ConfigurationChangeTransport[];
}

export interface MergeDiffTransport {
    configuration: MergeDiffDetailTransport;
    metadata: MergeDiffDetailTransport;
}

export interface MergePreviewPackageTransport {
    sourceChange: ChangeType;
    targetChange: ChangeType;
    changeDate: string;
    updatedBy: string;
    changes: MergeDiffTransport;
}

export interface MergePreviewNodeTransport {
    nodeKey: string;
    name: string;
    type: string;
    parentNodeKey?: string;
    invalidContent: boolean;
    sourceChange: ChangeType;
    targetChange: ChangeType;
    changeDate: string;
    updatedBy: string;
    changes: MergeDiffTransport;
}

export interface MergePreviewTransport {
    commonPackageKey: string;
    commonVersion: string;
    packageChanges: MergePreviewPackageTransport;
    nodeChanges: MergePreviewNodeTransport[];
}

export interface PackageVersionCreatedTransport {
    packageKey: string;
    version: string;
    summaryOfChanges?: string;
    creationDate: string;
    createdBy: string;
}

export interface MergeApplyOptions {
    sourceKey?: string;
    sourceVersion?: string;
    file?: string;
    bump?: string;
    version?: string;
    summary?: string;
    jsonResponse?: boolean;
}
