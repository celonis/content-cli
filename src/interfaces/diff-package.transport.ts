export interface ConfigurationChangeTransport {
    op: string;
    path: string;
    from: string;
    value: object;
}

export interface NodeDiffTransport {
    nodeKey: string;
    changes: ConfigurationChangeTransport[];
    baseConfiguration: NodeConfiguration
}

export interface NodeConfiguration {
    [key: string]: any;
}

export interface PackageDiffTransport {
    packageKey: string;
    basePackageConfiguration: PackageConfiguration,
    packageChanges: ConfigurationChangeTransport[];
    nodesWithChanges: NodeDiffTransport[];
}

export interface PackageConfiguration {
    variables?: VariableDefinition[],
    dependencies?: PackageDependency[],
    [key: string]: any;
}

export interface PackageDependency {
    key: string,
    version: string,
    [key: string]: any;
}

export interface VariableDefinition {
    key: string,
    type: string,
    [key: string]: any;
}

export interface PackageDiffMetadata {
    packageKey: string;
    hasChanges: boolean;
}