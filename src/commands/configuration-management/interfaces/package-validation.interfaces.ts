export interface PackageValidationRequest {
    layers: string[];
    nodeKeys?: string[];
}

export interface SchemaValidationResponse {
    packageKey: string;
    valid: boolean;
    summary: SchemaValidationSummary;
    results: SchemaValidationResult[];
}

export interface SchemaValidationSummary {
    errors: number;
    warnings: number;
    info: number;
}

export interface SchemaValidationResult {
    layer: string;
    severity: string;
    nodeKey: string;
    assetType: string;
    path: string;
    code: string;
    message: string;
    suggestion?: string;
}
