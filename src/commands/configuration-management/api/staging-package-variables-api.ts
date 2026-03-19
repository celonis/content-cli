import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";
import { HttpClient } from "../../../core/http/http-client";
import { StagingVariableManifestTransport } from "../interfaces/package-export.interfaces";

/** Staging variable row from Pacman (VariableTransport). */
export interface StagingPackageVariableTransport {
    key: string;
    type: string;
    value?: unknown;
    metadata?: unknown;
}

export class StagingPackageVariablesApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    /**
     * Public Pacman API (TA-5048): staging variables for a package.
     * Backend returns an array of VariableTransport; we wrap as { packageKey, variables }.
     */
    public async findAllByPackageKey(packageKey: string, variableType?: string): Promise<StagingVariableManifestTransport> {
        const params = new URLSearchParams();
        if (variableType) {
            params.set("type", variableType);
        }
        const query = params.toString();
        const path = `/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/variables${query ? `?${query}` : ""}`;
        const response = await this.httpClient()
            .get(path)
            .catch((e: unknown) => {
                throw new FatalError(`Problem listing staging variables for package '${packageKey}': ${e}`);
            });
        const variables = Array.isArray(response) ? response : (response as StagingVariableManifestTransport).variables ?? [];
        return { packageKey, variables };
    }
}
