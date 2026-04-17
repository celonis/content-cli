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

    public async getSchema(assetType: string): Promise<any> {
        return this.httpClient()
            .get(`/pacman/api/core/asset-registry/schemas/${encodeURIComponent(assetType)}`)
            .catch((e) => {
                throw new FatalError(`Problem getting schema for asset type '${assetType}': ${e}`);
            });
    }

    public async getExamples(assetType: string): Promise<any> {
        return this.httpClient()
            .get(`/pacman/api/core/asset-registry/examples/${encodeURIComponent(assetType)}`)
            .catch((e) => {
                throw new FatalError(`Problem getting examples for asset type '${assetType}': ${e}`);
            });
    }

    public async getMethodology(assetType: string): Promise<any> {
        return this.httpClient()
            .get(`/pacman/api/core/asset-registry/methodologies/${encodeURIComponent(assetType)}`)
            .catch((e) => {
                throw new FatalError(`Problem getting methodology for asset type '${assetType}': ${e}`);
            });
    }
}
