export interface AssetRegistryMetadata {
    types: Record<string, AssetRegistryDescriptor>;
}

export interface AssetRegistryDescriptor {
    assetType: string;
    displayName: string;
    description: string | null;
    group: string;
    assetSchema: AssetSchema;
    service: AssetService;
    endpoints: AssetEndpoints;
    contributions: AssetContributions;
}

export interface AssetSchema {
    version: string;
}

export interface AssetService {
    basePath: string;
}

export interface AssetEndpoints {
    schema: string;
    validate: string;
    methodology?: string;
    examples?: string;
}

export interface AssetContributions {
    pigEntityTypes: string[];
    dataPipelineEntityTypes: string[];
    actionTypes: string[];
}
