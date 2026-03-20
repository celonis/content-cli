import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";
import { HttpClient } from "../../../core/http/http-client";
import { StagingVariableManifestTransport } from "../interfaces/package-export.interfaces";

export class StagingPackageVariablesApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findAllByPackageKeys(
        packageKeys: string[],
        variableType?: string
    ): Promise<StagingVariableManifestTransport[]> {
        const params = new URLSearchParams();
        if (variableType) {
            params.set("variableType", variableType);
        }
        const query = params.toString();
        const path = `/pacman/api/core/staging/packages/variables/by-package-keys${query ? `?${query}` : ""}`;
        return await this.httpClient()
            .post(path, packageKeys)
            .catch(e => {
                throw new FatalError(`Problem listing staging variables for packages: ${e}`);
            });
    }
}
