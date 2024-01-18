import {httpClientV2} from "../services/http-client-service.v2";
import {
    ActivatePackageTransport,
    ContentNodeTransport,
    PackageHistoryTransport,
    PackageManagerVariableType,
    PackageWithVariableAssignments
} from "../interfaces/package-manager.interfaces";
import {FatalError} from "../util/logger";


class PackageApi {
    public static readonly INSTANCE = new PackageApi();

    public async findAllPackages(): Promise<ContentNodeTransport[]> {
        return httpClientV2.get("/package-manager/api/packages").catch(e => {
            throw new FatalError(`Problem getting packages: ${e}`);
        });
    }

    public async exportPackage(rootPackageKey: string, version?: string, excludeActionFlows?: boolean): Promise<Buffer> {
        const queryParams = new URLSearchParams();
        queryParams.set("newKey", rootPackageKey);
        queryParams.set("version", version ?? "");
        queryParams.set("excludeActionFlows", excludeActionFlows ? "true" : "false");

        return await httpClientV2.downloadFile(`/package-manager/api/packages/${rootPackageKey}/export?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Pacakge ${rootPackageKey}_${version} failed to export.`)
        });
    }

    public async findAllPackagesWithVariableAssignments(type: PackageManagerVariableType): Promise<PackageWithVariableAssignments[]> {
        const queryParams = new URLSearchParams();
        if (type) {
            queryParams.set("type", type);
        }

        return httpClientV2.get(`/package-manager/api/packages/with-variable-assignments?${queryParams.toString()}`).catch(e => {
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

    public async findActiveVersionByIds(nodeIds: string[]): Promise<PackageHistoryTransport[]> {
        return httpClientV2.post("/package-manager/api/packages/active/by-ids", nodeIds).catch(e => {
            throw new FatalError(`Problem getting latest version of packages: ${e}`);
        });
    }

    public async findNextVersion(nodeId: string): Promise<PackageHistoryTransport> {
        return httpClientV2.get(`/package-manager/api/packages/${nodeId}/next-version`).catch(e => {
            throw new FatalError(`Problem getting latest version of package: ${e}`);
        });
    }

    public async importPackage(nodeContent: any, spaceId: string, overwrite: boolean, excludeActionFlows?: boolean): Promise<any> {
        await httpClientV2.postFile("/package-manager/api/packages/import", nodeContent, {
            spaceId: spaceId,
            overwrite: overwrite,
            excludeActionFlows: excludeActionFlows
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
