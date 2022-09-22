export interface SaveContentNode {
    key: string;
    rootNodeKey: string;
    name: string;
    nodeType: string;
    assetType: string;
    serializedContent: string;
    extraMetadata: AssetMetadataTransport;
}

export class AssetMetadataTransport {
    public hidden: boolean;
}
