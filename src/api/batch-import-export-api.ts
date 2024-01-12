import {PackageExportTransport} from "../interfaces/package-export-transport";
import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";

class BatchImportExportApi {
    public static readonly INSTANCE = new BatchImportExportApi();

    public async findAllActivePackages(flavors: string[], withDependencies: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        queryParams.set("withDependencies", withDependencies.toString());
        flavors.forEach(flavor => queryParams.append("flavors", flavor))

        return httpClientV2.get(`/package-manager/api/core/packages/export/list?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting active packages: ${e}`);
        });
    }

    public async findActivePackagesByKeys(packageKeys: string[], withDependencies: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        packageKeys.forEach(key => queryParams.append("packageKeys", key))
        queryParams.set("withDependencies", withDependencies.toString());

        return httpClientV2.get(`/package-manager/api/core/packages/export/list-by-keys?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting active packages by keys: ${e}`);
        });
    }
}

export const batchImportExportApi = BatchImportExportApi.INSTANCE;