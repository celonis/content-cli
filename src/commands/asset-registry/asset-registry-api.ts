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

    public async listTypes(flavor?: string): Promise<AssetRegistryMetadata> {
        return this.httpClient()
            .get(AssetRegistryApi.withQuery(AssetRegistryApi.endpointUrl("types"), { flavor }))
            .catch((e) => handleAssetRegistryApiError("listing asset registry types", e));
    }

    public async getType(assetType: string): Promise<AssetRegistryDescriptor> {
        return this.httpClient()
            .get(AssetRegistryApi.endpointUrl("types", encodeURIComponent(assetType)))
            .catch((e) => handleAssetRegistryApiError(`getting asset type '${assetType}'`, e));
    }

    public async getSchema(assetType: string, path?: string): Promise<any> {
        return this.httpClient()
            .get(AssetRegistryApi.withQuery(AssetRegistryApi.endpointUrl("schemas", encodeURIComponent(assetType)), { path }))
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

    private static withQuery(url: string, params: Record<string, string | undefined>): string {
        const queryParams = new URLSearchParams();
        Object.entries(params)
            .filter(([, value]) => value !== undefined && value.trim() !== "")
            .forEach(([name, value]) => queryParams.set(name, value));
        const query = queryParams.toString();
        return query ? `${url}?${query}` : url;
    }
}
