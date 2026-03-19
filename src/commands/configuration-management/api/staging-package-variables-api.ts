import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";
import { HttpClient } from "../../../core/http/http-client";
import { StagingVariableManifestTransport } from "../interfaces/package-export.interfaces";

export class StagingPackageVariablesApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findAllByPackageKey(packageKey: string, variableType?: string): Promise<StagingVariableManifestTransport> {
        const params = new URLSearchParams();
        if (variableType) {
            params.set("type", variableType);
        }
        const query = params.toString();
        const path = `/pacman/api/core/staging/packages/${packageKey}/variables${query ? `?${query}` : ""}`;
        return await this.httpClient()
            .get(path)
            .catch(e => {
                throw new FatalError(`Problem listing staging variables for package '${packageKey}': ${e}`);
            });
    }
}
