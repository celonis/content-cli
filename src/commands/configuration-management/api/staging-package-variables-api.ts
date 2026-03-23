import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";
import { HttpClient } from "../../../core/http/http-client";
import { StagingVariableManifestTransport } from "../interfaces/package-export.interfaces";

export class StagingPackageVariablesApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findAllByPackageKeys(packageKeys: string[]): Promise<StagingVariableManifestTransport[]> {
        const path = `/pacman/api/core/staging/packages/variables/by-package-keys`;
        return await this.httpClient()
            .post(path, packageKeys)
            .catch(e => {
                throw new FatalError(`Problem listing staging variables for packages: ${e}`);
            });
    }
}
