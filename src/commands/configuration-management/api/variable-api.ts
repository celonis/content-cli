import { PackageKeyAndVersionPair, VariableManifestTransport } from "../interfaces/package-export.interfaces";
import { FatalError } from "../../../core/utils/logger";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";

export class VariableApi {

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findVariablesWithValuesByPackageKeysAndVersion(packagesByKeyAndVersion: PackageKeyAndVersionPair[]): Promise<VariableManifestTransport[]> {
        return this.httpClient().post("/package-manager/api/core/packages/export/batch/variables-with-assignments", packagesByKeyAndVersion).catch(e => {
            throw new FatalError(`Problem exporting package variables: ${e}`);
        })
    }
}
