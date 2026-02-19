import {PackageDependencyTransport} from "../interfaces/package-manager.interfaces";
import {HttpClient} from "../../../core/http/http-client";
import {Context} from "../../../core/command/cli-context";
import {FatalError} from "../../../core/utils/logger";

export class PackageDependenciesApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findDependenciesOfPackage(nodeId: string, draftId: string): Promise<PackageDependencyTransport[]> {
        return this.httpClient()
            .get(`/package-manager/api/package-dependencies/${nodeId}/by-root-draft-id/${draftId}`)
            .catch(e => {
                throw new FatalError(`Problem getting dependencies of package: ${e}`);
            });
    }

    public async findPackageDependenciesByIds(
        nodeDraftIdMap: Map<string, string>
    ): Promise<Map<string, PackageDependencyTransport[]>> {
        return await this.httpClient()
            .post("/package-manager/api/package-dependencies/by-ids", Object.fromEntries(nodeDraftIdMap))
            .catch(e => {
                throw new FatalError(`Problem getting dependencies of package: ${e}`);
            });
    }

    public async updatePackageDependency(nodeId: string, packageDependency: PackageDependencyTransport): Promise<void> {
        await this.httpClient()
            .put(
                `/package-manager/api/package-dependencies/${nodeId}/dependency/by-key/${packageDependency.key}`,
                packageDependency
            )
            .catch(e => {
                throw new FatalError(`Problem updating package dependency: ${e}`);
            });
    }

    public async createDependencies(packageId: string, packageDependency: PackageDependencyTransport[]): Promise<void> {
        await this.httpClient()
            .post(`/package-manager/api/package-dependencies/${packageId}`, packageDependency)
            .catch(e => {
                throw new FatalError(`Problem updating package dependency: ${e}`);
            });
    }

    public async deleteDependency(packageId: string, packageDependencyKey: string): Promise<void> {
        await this.httpClient()
            .delete(`/package-manager/api/package-dependencies/${packageId}/dependency/by-key/${packageDependencyKey}`)
            .catch(e => {
                throw new FatalError(`Problem updating package dependency: ${e}`);
            });
    }
}
