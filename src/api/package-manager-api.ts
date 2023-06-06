import {httpClientV2} from "../services/http-client-service.v2";

export interface AssetMetadataTransport {
    hidden: boolean;
}

export interface ContentNodeTransport {
    id: string;
    key: string;
    name: string;
    rootNodeKey : string;
    workingDraftId: string;
    activatedDraftId: string;
    rootNodeId: string;
    assetMetadataTransport: AssetMetadataTransport;
    spaceId: string;
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

class PackageManagerApi {
    public findAllPackages(): Promise<ContentNodeTransport[]> {
        return httpClientV2.get("/package-manager/api/packages");
    }

    public async findAllNodesOfType(assetType?: string): Promise<ContentNodeTransport[]> {
        return httpClientV2.get(`/package-manager/api/nodes?assetType=${assetType}`)
    }

    public findDependenciesOfPackage(nodeId: string, draftId: string): Promise<PackageDependencyTransport[]> {
        return httpClientV2.get(`/package-manager/api/package-dependencies/${nodeId}/by-root-draft-id/${draftId}`)
    }

    public findAllPackagesWithVariableAssignments(): Promise<PackageWithVariableAssignments[]> {
        return httpClientV2.get("/package-manager/api/packages/with-variable-assignments")
    }

}

export const packageManagerApi = new PackageManagerApi();
