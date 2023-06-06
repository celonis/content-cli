import {AssetMetadataTransport} from "../api/package-manager-api";

export interface SaveContentNode {
    key: string;
    rootNodeKey: string;
    name: string;
    nodeType: string;
    assetType: string;
    serializedContent: string;
    assetMetadataTransport: AssetMetadataTransport;
}

