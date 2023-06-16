export interface AssetMetadataTransport {
    hidden: boolean;
}

export interface ContentNodeTransport {
    id: string;
    key: string;
    name: string;
    rootNodeKey: string;
    workingDraftId: string;
    activatedDraftId: string;
    rootNodeId: string;
    assetMetadataTransport: AssetMetadataTransport;
    spaceId: string;
}

export interface DataModelTransport {
    id: string;
    name: string,
    poolId: string;
}

export interface PackageDependencyTransport {
    id: string;
    key: string;
    name: string;
    version: string;
    rootNodeId: string;
}

export interface AssetMetadataTransport {
    hidden: boolean;
}

export interface PackageWithVariableAssignments {
    id: string;
    key: string;
    name: string;
    createdBy: string;
    variableAssignments: VariablesAssignments[]
}

export interface VariablesAssignments {
    key: string;
    value: object;
    type: string;
}

export interface PackageHistoryTransport {
    id: string;
    key: string;
    name: string;
    version: string;
}

export interface StudioDataModelTransport {
    node: StudioComputeNodeDescriptor;
    dataPool: ComputePoolTransport;
}

export interface StudioComputeNodeDescriptor {
    name: string;
    dataModelId: string;
}

export interface ComputePoolTransport {
    id: string;
    name: string;
}

export interface SpaceTransport {
    spaceIcon: string;
    name: string;
    id: string;
}

