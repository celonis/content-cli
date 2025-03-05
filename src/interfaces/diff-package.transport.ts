export interface ConfigurationChangeTransport {
    op: string;
    path: string;
    from: string;
    value: object;
}

export interface NodeDiffTransport {
    nodeKey: string;
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