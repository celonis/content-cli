import * as FormData from "form-data";
import {
    PackageExportTransport,
    PostPackageImportData,
} from "../../configuration-management/interfaces/package-export.interfaces";
import { FatalError } from "../../../core/utils/logger";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";

export class T2tcPackageApi {

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findAllActivePackages(flavors: string[], withDependencies: boolean = false, includeBranches: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        queryParams.set("withDependencies", withDependencies.toString());
        queryParams.set("includeBranches", includeBranches.toString());
        flavors.forEach(flavor => queryParams.append("flavors", flavor));

        return this.httpClient().get(`/package-manager/api/core/packages/export/list?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting active packages: ${e}`);
        });
    }

    public async findActivePackagesByVariableValue(flavors: string[], variableValue: string, variableType: string, includeBranches: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        queryParams.set("variableValue", variableValue);
        if (variableType) {
            queryParams.set("variableType", variableType);
        }
        queryParams.set("includeBranches", includeBranches.toString());
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

    public async findPackagesByKeysAndVersion(packageKeysWithVersion: string[], withDependencies: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        packageKeysWithVersion.forEach(keyWithVersion => queryParams.append("packageKeysWithVersion", keyWithVersion));
        queryParams.set("withDependencies", withDependencies.toString());

        return this.httpClient().get(`/package-manager/api/core/packages/versions/export/list?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting packages by keys and versions: ${e}`);
        });
    }

    public async exportPackages(packageKeys: string[], withDependencies: boolean): Promise<Buffer> {
        const queryParams = new URLSearchParams();
        packageKeys.forEach(packageKey => queryParams.append("packageKeys", packageKey));
        queryParams.set("withDependencies", withDependencies.toString());

        return this.httpClient().getFile(`/package-manager/api/core/packages/export/batch?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem exporting packages: ${e}`);
        });
    }

    public async exportPackagesByVersions(packageKeysWithVersion: string[], withDependencies: boolean): Promise<Buffer> {
        const queryParams = new URLSearchParams();
        packageKeysWithVersion.forEach(packageKeyByVersion => queryParams.append("packageKeysWithVersion", packageKeyByVersion));
        queryParams.set("withDependencies", withDependencies.toString());

        return this.httpClient().getFile(`/package-manager/api/core/packages/versions/export/batch?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem exporting packages by versions: ${e}`);
        });
    }

    public async importPackages(data: FormData, overwrite: boolean, performValidation: boolean): Promise<PostPackageImportData[]> {
        return this.httpClient().postFile(
            "/package-manager/api/core/packages/import/batch",
            data,
            {overwrite, performValidation}
        );
    }
}
