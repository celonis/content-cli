import { HttpClient } from "../../core/http/http-client";
import { Context } from "../../core/command/cli-context";
import {
    AssetRegistryDescriptor,
    AssetRegistryMetadata,
} from "./asset-registry.interfaces";
import { handleAssetRegistryApiError } from "./asset-registry-error";

export class AssetRegistryApi {
    private static readonly BASE_URL = "/pacman/api/core/asset-registry";

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async listTypes(): Promise<AssetRegistryMetadata> {
        return this.httpClient()
            .get(AssetRegistryApi.endpointUrl("types"))
            .catch((e) => handleAssetRegistryApiError("listing asset registry types", e));
    }

    public async getType(assetType: string): Promise<AssetRegistryDescriptor> {
        return this.httpClient()
            .get(AssetRegistryApi.endpointUrl("types", encodeURIComponent(assetType)))
            .catch((e) => handleAssetRegistryApiError(`getting asset type '${assetType}'`, e));
    }

    public async getSchema(assetType: string): Promise<any> {
        return this.httpClient()
            .get(AssetRegistryApi.endpointUrl("schemas", encodeURIComponent(assetType)))
            .catch((e) => handleAssetRegistryApiError(`getting schema for asset type '${assetType}'`, e));
    }

    public async getExamples(assetType: string): Promise<any> {
        return this.httpClient()
            .get(AssetRegistryApi.endpointUrl("examples", encodeURIComponent(assetType)))
            .catch((e) => handleAssetRegistryApiError(`getting examples for asset type '${assetType}'`, e));
    }

    private static endpointUrl(...segments: string[]): string {
        return `${AssetRegistryApi.BASE_URL}/${segments.join("/")}`;
    }
}
