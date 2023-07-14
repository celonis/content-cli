import {PackageDependencyTransport} from "../interfaces/package-manager.interfaces";
import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";

class PackageDependenciesApi {
    public static readonly INSTANCE = new PackageDependenciesApi();

    public async findDependenciesOfPackage(nodeId: string, draftId: string): Promise<PackageDependencyTransport[]> {
        return httpClientV2.get(`/package-manager/api/package-dependencies/${nodeId}/by-root-draft-id/${draftId}`)
            .catch(e=> {
                throw new FatalError(`Problem getting dependencies of package: ${e}`);
            });
    }

    public async findPackageDependenciesByIds(nodeDraftIdMap: Map<string, string>): Promise<Map<string, PackageDependencyTransport[]>> {
        return await httpClientV2.post("/package-manager/api/package-dependencies/by-ids", Object.fromEntries(nodeDraftIdMap))
            .catch(e=> {
                throw new FatalError(`Problem getting dependencies of package: ${e}`);
            });
    }

    public async updatePackageDependency(nodeId: string, packageDependency: PackageDependencyTransport): Promise<void> {
        await httpClientV2.put(`/package-manager/api/package-dependencies/${nodeId}/dependency/by-key/${packageDependency.key}`, packageDependency).catch(e => {
            throw new FatalError(`Problem updating package dependency: ${e}`);
        });
    }
}

export const packageDependenciesApi = PackageDependenciesApi.INSTANCE;