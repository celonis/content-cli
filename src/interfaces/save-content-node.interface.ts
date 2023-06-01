export interface VariablesAssignments {
    key: string;
    value: object;
    type: string;
}

export interface DependenciesTransport {
    id: string;
    key: string;
    name: string;
    version: string;
}

export interface SaveContentNode {
    id: string,
    key: string;
    spaceId: string,
    rootNodeKey: string;
    workingDraftId: string;
    activatedDraftId: string;
    name: string;
    nodeType: string;
    assetType: string;
    serializedContent: string;
    assetMetadataTransport: AssetMetadataTransport;
    dependencies: DependenciesTransport[];
    variables: VariablesAssignments[];
}

export class AssetMetadataTransport {
    public hidden: boolean;
}
