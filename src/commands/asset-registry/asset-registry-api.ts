import { HttpClient } from "../../core/http/http-client";
import { Context } from "../../core/command/cli-context";
import { AssetRegistryDescriptor, AssetRegistryMetadata } from "./asset-registry.interfaces";
import { FatalError } from "../../core/utils/logger";

export class AssetRegistryApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async listTypes(): Promise<AssetRegistryMetadata> {
        return this.httpClient()
            .get("/pacman/api/core/asset-registry/types")
            .catch((e) => {
                throw new FatalError(`Problem listing asset registry types: ${e}`);
            });
    }

    public async getType(assetType: string): Promise<AssetRegistryDescriptor> {
        return this.httpClient()
            .get(`/pacman/api/core/asset-registry/types/${encodeURIComponent(assetType)}`)
            .catch((e) => {
                throw new FatalError(`Problem getting asset type '${assetType}': ${e}`);
            });
    }
}
