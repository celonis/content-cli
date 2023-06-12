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
}

export const packageDependenciesApi = PackageDependenciesApi.INSTANCE;