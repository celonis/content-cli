import {AssetMetadataTransport} from "../api/package-manager-api";

export interface SaveContentNode {
    id: string,
    key: string;
    spaceId: string,
    rootNodeKey: string;
    name: string;
    nodeType: string;
    assetType: string;
    serializedContent: string;
    assetMetadataTransport: AssetMetadataTransport;
}

