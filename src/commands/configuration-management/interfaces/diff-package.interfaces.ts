export interface ConfigurationChangeTransport {
    op: string;
    path: string;
    from: string;
    value: object;
    fromValue: object;
}

export enum NodeConfigurationChangeType {
    ADDED = "ADDED",
    DELETED = "DELETED",
    CHANGED = "CHANGED",
    UNCHANGED = "UNCHANGED",
    INVALID = "INVALID",
}

export interface NodeDiffTransport {
    nodeKey: string;
    name: string;
    type: string;
    changeType: NodeConfigurationChangeType;
    changes: ConfigurationChangeTransport[];
}

export interface PackageDiffTransport {
    packageKey: string;
    packageChanges: ConfigurationChangeTransport[];
    nodesWithChanges: NodeDiffTransport[];
}

export interface PackageDiffMetadata {
    packageKey: string;
    hasChanges: boolean;
}
