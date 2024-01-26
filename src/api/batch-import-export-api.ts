import {
    PackageExportTransport,
    PackageKeyAndVersionPair,
    VariableManifestTransport
} from "../interfaces/package-export-transport";
import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";

class BatchImportExportApi {
    public static readonly INSTANCE = new BatchImportExportApi();

    public findAllActivePackages(flavors: string[], withDependencies: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        queryParams.set("withDependencies", withDependencies.toString());
        flavors.forEach(flavor => queryParams.append("flavors", flavor))

        return httpClientV2.get(`/package-manager/api/core/packages/export/list?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting active packages: ${e}`);
        });
    }

    public findActivePackagesByKeys(packageKeys: string[], withDependencies: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        packageKeys.forEach(key => queryParams.append("packageKeys", key))
        queryParams.set("withDependencies", withDependencies.toString());

        return httpClientV2.get(`/package-manager/api/core/packages/export/list-by-keys?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting active packages by keys: ${e}`);
        });
    }

    public findVariablesWithValuesByPackageKeysAndVersion(packagesByKeyAndVersion: PackageKeyAndVersionPair[]): Promise<VariableManifestTransport[]> {
        return httpClientV2.post("/package-manager/api/core/packages/export/batch/variables-with-assignments", packagesByKeyAndVersion).catch(e => {
            throw new FatalError(`Problem exporting package variables: ${e}`);
        })
    }
}

export const batchImportExportApi = BatchImportExportApi.INSTANCE;