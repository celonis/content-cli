import { BaseApi } from "../../../core/base-api";
import { Context } from "../../../core/cli-context";
import { HttpClient } from "../../../core/http-client";
import {
    PackageExportTransport,
    PackageKeyAndVersionPair, PostPackageImportData,
    VariableManifestTransport
} from "../../../interfaces/package-export-transport";
import {FatalError} from "../../../util/logger";
import * as FormData from "form-data";

export class ConfigServiceApi extends BaseApi {
    
    constructor(private context : Context) {
        super(context.httpClient);
    }  

    public findAllActivePackages(flavors: string[], withDependencies: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        queryParams.set("withDependencies", withDependencies.toString());
        flavors.forEach(flavor => queryParams.append("flavors", flavor))

        return this.httpClient.get(`/package-manager/api/core/packages/export/list?${queryParams.toString()}`)
            .catch(e => {
                return this.handleError(e);
            });
    }

    public findActivePackagesByKeys(packageKeys: string[], withDependencies: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        packageKeys.forEach(key => queryParams.append("packageKeys", key))
        queryParams.set("withDependencies", withDependencies.toString());

        return this.httpClient.get(`/package-manager/api/core/packages/export/list-by-keys?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting active packages by keys: ${e}`);
        });
    }

    public exportPackages(packageKeys: string[], withDependencies: boolean = false): Promise<Buffer> {
        const queryParams = new URLSearchParams();
        packageKeys.forEach(packageKey => queryParams.append("packageKeys", packageKey));
        queryParams.set("withDependencies", withDependencies.toString());

        return this.httpClient.getFile(`/package-manager/api/core/packages/export/batch?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem exporting packages: ${e}`);
        });
    }

    public importPackages(data: FormData, overwrite: boolean): Promise<PostPackageImportData[]> {
        return this.httpClient.postFile(
            "/package-manager/api/core/packages/import/batch",
            data,
            {overwrite}
        );
    }

    public findVariablesWithValuesByPackageKeysAndVersion(packagesByKeyAndVersion: PackageKeyAndVersionPair[]): Promise<VariableManifestTransport[]> {
        return this.httpClient.post("/package-manager/api/core/packages/export/batch/variables-with-assignments", packagesByKeyAndVersion).catch(e => {
            throw new FatalError(`Problem exporting package variables: ${e}`);
        })
    }
}