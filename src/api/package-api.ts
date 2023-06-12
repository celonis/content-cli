import {httpClientV2} from "../services/http-client-service.v2";
import {
    ContentNodeTransport, DataModelTransport,
    PackageDependencyTransport, PackageHistoryTransport, PackageWithVariableAssignments, StudioDataModelTransport
} from "../interfaces/package-manager.interfaces";



class PackageApi {
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

    public async findAssignedDatamodels(packageKey: string) : Promise<StudioDataModelTransport[]> {
        return httpClientV2.get(`/package-manager/api/compute-pools/data-models/assigned?packageKey=${packageKey}`);

    }
}

export const packageApi = new PackageApi();
