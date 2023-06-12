import {httpClientV2} from "../services/http-client-service.v2";

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

class PackageManagerApi {
    public async findAllPackages(): Promise<ContentNodeTransport[]> {
        return httpClientV2.get("/package-manager/api/packages");
    }

    public async findAllNodesOfType(assetType?: string): Promise<ContentNodeTransport[]> {
        return httpClientV2.get(`/package-manager/api/nodes?assetType=${assetType}`)
    }

    public async findDependenciesOfPackage(nodeId: string, draftId: string): Promise<PackageDependencyTransport[]> {
        return httpClientV2.get(`/package-manager/api/package-dependencies/${nodeId}/by-root-draft-id/${draftId}`)
    }

    public async findAllPackagesWithVariableAssignments(): Promise<PackageWithVariableAssignments[]> {
        return httpClientV2.get("/package-manager/api/packages/with-variable-assignments")
    }

    public async findLatestVersionById(nodeId: string): Promise<PackageHistoryTransport> {
        return httpClientV2.get(`/package-manager/api/packages/${nodeId}/latest-version`);
    }

    public async getDataModel(dataModelId: string,packageKey : string): Promise<DataModelTransport> {
        return httpClientV2.get(`/package-manager/api/compute-pools/data-models/${dataModelId}?packageKey=${packageKey}`);
    }
}

export const packageManagerApi = new PackageManagerApi();
