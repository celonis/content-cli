import { AssetMetadataTransport } from "./package-manager.interfaces";

export interface SaveContentNode {
    key: string;
    rootNodeKey: string;
    name: string;
    nodeType: string;
    assetType: string;
    serializedContent: string;
    assetMetadataTransport: AssetMetadataTransport;
}

