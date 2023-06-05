import {httpClientV2} from "../services/http-client-service.v2";

export interface AssetMetadataTransport {
    hidden: boolean;
}

export interface ContentNodeTransport {
    id: string;
    key: string;
    name: string;
    rootNodeKey: string;
    assetType: string;
    nodeType: string;
    parentNodeId: string;
    invalidContent: string;
    serializedContent: string;
    serializationType: string;
    draftId: string; // TODO - Delete after the external services have adapted to the change
    workingDraftId: string;
    activatedDraftId: string;
    showInViewerMode: boolean;
    rootNodeId: string;
    assetMetadataTransport: AssetMetadataTransport;
    spaceId: string;
}

export interface PackageDependencyTransport {
    id: string; // package id of the dependency
    key: string;
    name: string;
    version: string;
    external: boolean;
    draftId: string;
    rootNodeId: string; // id of the package that this dependency exists in
    updateAvailable: string;
    deleted: string;
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

    public async findAllNodesOfType(assetType?: string): Promise<any[]> {
        return httpClientV2.get(`/package-manager/api/nodes?assetType=${assetType}`)
    }

    public findDependenciesOfPackage(nodeIds: string, draftId: string): Promise<PackageDependencyTransport[]> {
        return httpClientV2.get(`/package-manager/api/package-dependencies/${nodeIds}/by-root-draft-id/${draftId}`)
    }

    public findAllPackagesWithVariableAssignments(): Promise<PackageWithVariableAssignments[]> {
        return httpClientV2.get("/package-manager/api/packages/with-variable-assignments")
    }

}

export const packageManagerApi = new PackageManagerApi();
