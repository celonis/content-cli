import * as FormData from "form-data";
import {
    PackageExportTransport,
    PackageKeyAndVersionPair, PackageMetadataExportTransport,
    PostPackageImportData, VariableManifestTransport,
} from "../interfaces/package-export.interfaces";
import { FatalError } from "../../../core/utils/logger";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";

export class BatchImportExportApi {

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findAllActivePackages(flavors: string[], withDependencies: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        queryParams.set("withDependencies", withDependencies.toString());
        flavors.forEach(flavor => queryParams.append("flavors", flavor))

        return this.httpClient().get(`/package-manager/api/core/packages/export/list?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting active packages: ${e}`);
        });
    }

    public async findActivePackagesByVariableValue(flavors: string[], variableValue: string, variableType: string): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        queryParams.set("variableValue", variableValue);
        if (variableType) {
            queryParams.set("variableType", variableType);
        }
        flavors.forEach(flavor => queryParams.append("flavors", flavor))

        return this.httpClient().get(`/package-manager/api/core/packages/export/list-by-variable-value?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting active packages by variable value: ${e}`);
        });
    }

    public async findActivePackagesByKeys(packageKeys: string[], withDependencies: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        packageKeys.forEach(key => queryParams.append("packageKeys", key))
        queryParams.set("withDependencies", withDependencies.toString());

        return this.httpClient().get(`/package-manager/api/core/packages/export/list-by-keys?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting active packages by keys: ${e}`);
        });
    }

    public async exportPackages(packageKeys: string[], withDependencies: boolean = false): Promise<Buffer> {
        const queryParams = new URLSearchParams();
        packageKeys.forEach(packageKey => queryParams.append("packageKeys", packageKey));
        queryParams.set("withDependencies", withDependencies.toString());

        return this.httpClient().getFile(`/package-manager/api/core/packages/export/batch?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem exporting packages: ${e}`);
        });
    }

    public async batchExportPackagesMetadata(packageKeys: string[]): Promise<PackageMetadataExportTransport[]> {
        const queryParams = new URLSearchParams();
        packageKeys.forEach(packageKey => queryParams.append("packageKeys", packageKey));

        return this.httpClient().get(`/package-manager/api/core/packages/metadata/export?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem exporting packages metadata: ${e}`);
        })
    }

    public async importPackages(data: FormData, overwrite: boolean): Promise<PostPackageImportData[]> {
        return this.httpClient().postFile(
            "/package-manager/api/core/packages/import/batch",
            data,
            {overwrite}
        );
    }

    public async findVariablesWithValuesByPackageKeysAndVersion(packagesByKeyAndVersion: PackageKeyAndVersionPair[]): Promise<VariableManifestTransport[]> {
        return this.httpClient().post("/package-manager/api/core/packages/export/batch/variables-with-assignments", packagesByKeyAndVersion).catch(e => {
            throw new FatalError(`Problem exporting package variables: ${e}`);
        })
    }
}
