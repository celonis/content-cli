import {httpClientV2} from "../services/http-client-service.v2";
import {
    ActivatePackageTransport,
    ContentNodeTransport, PackageDependencyTransport, PackageHistoryTransport, PackageWithVariableAssignments
} from "../interfaces/package-manager.interfaces";
import {FatalError} from "../util/logger";


class PackageApi {
    public static readonly INSTANCE = new PackageApi();

    public async findAllPackages(): Promise<ContentNodeTransport[]> {
        return httpClientV2.get("/package-manager/api/packages").catch(e => {
            throw new FatalError(`Problem getting packages: ${e}`);
        });
    }

    public async exportPackage(rootPackageKey: string, version?: string): Promise<Buffer> {
        return await httpClientV2.downloadFile(`/package-manager/api/packages/${rootPackageKey}/export?newKey=${rootPackageKey}${version ? `&version=${version}` : ""}`);
    }

    public async findAllPackagesWithVariableAssignments(): Promise<PackageWithVariableAssignments[]> {
        return httpClientV2.get("/package-manager/api/packages/with-variable-assignments").catch(e => {
            throw new FatalError(`Problem getting variables of packages: : ${e}`);
        });
    }

    public async findLatestVersionById(nodeId: string): Promise<PackageHistoryTransport> {
        return httpClientV2.get(`/package-manager/api/packages/${nodeId}/latest-version`).catch(e => {
            throw new FatalError(`Problem getting latest version of package: ${e}`);
        });
    }

    public async findActiveVersionById(nodeId: string): Promise<PackageHistoryTransport> {
        return httpClientV2.get(`/package-manager/api/packages/${nodeId}/active`).catch(e => {
            throw new FatalError(`Problem getting latest version of package: ${e}`);
        });
    }

    public async findNextVersion(nodeId: string): Promise<PackageHistoryTransport> {
        return httpClientV2.get(`/package-manager/api/packages/${nodeId}/next-version`).catch(e => {
            throw new FatalError(`Problem getting latest version of package: ${e}`);
        });
    }

    public async importPackage(nodeContent: any, spaceId: string, overwrite: boolean): Promise<any> {
        await httpClientV2.postFile("/package-manager/api/packages/import", nodeContent, {
            spaceId: spaceId,
            overwrite: overwrite
        }).catch(e => {
            throw new FatalError(`Problem importing package: ${e}`);
        });
    }

    public async movePackageToSpace(nodeId: string, spaceId: string): Promise<void> {
        await httpClientV2.put(`/package-manager/api/packages/${nodeId}/move/${spaceId}`, {}).catch(e => {
            throw new FatalError(`Problem moving package: ${e}`);
        });
    }

    public async publishPackage(activatePackage: ActivatePackageTransport): Promise<void> {
        await httpClientV2.post(`/package-manager/api/packages/${activatePackage.packageKey}/activate`, activatePackage).catch(e => {
            throw new FatalError(`Problem activating package with key ${activatePackage.packageKey}: ${e}`);
        });
    }
}

export const packageApi = PackageApi.INSTANCE;
