export interface SaveContentNode {
    key: string;
    rootNodeKey: string;
    name: string;
    nodeType: string;
    assetType: string;
    serializedContent: string;
    assetMetadataTransport: AssetMetadataTransport;
}

export interface SaveContentNodeWithHiddenField extends SaveContentNode {
    hiddenInPublishedApps: boolean;
}

export class AssetMetadataTransport {
    public hidden: boolean;
}
