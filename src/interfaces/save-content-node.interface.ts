export interface SaveContentNode {
    key: string;
    rootNodeKey: string;
    name: string;
    nodeType: string;
    assetType: string;
    serializedContent: string;
    assetMetadataTransport: AssetMetadataTransport;
}

export class AssetMetadataTransport {
    public hidden: boolean;
}
