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
    hasChanges: boolean
    packageChanges: ConfigurationChangeTransport[];
    nodesWithChanges: NodeDiffTransport[];
}