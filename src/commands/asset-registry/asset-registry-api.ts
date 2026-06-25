import { HttpClient } from "../../core/http/http-client";
import { Context } from "../../core/command/cli-context";
import {
    AgentSkillsResponse,
    AssetRegistryDescriptor,
    AssetRegistryMetadata,
} from "./asset-registry.interfaces";
import { handleAssetRegistryApiError } from "./asset-registry-error";
import { trimSlashes } from "../../core/utils/path";
import * as path from "node:path";

export class AssetRegistryApi {
    private static readonly BASE_URL = "/pacman/api/core/asset-registry";

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async listTypes(): Promise<AssetRegistryMetadata> {
        return this.httpClient()
            .get(AssetRegistryApi.endpointUrl("types"))
            .catch((e) => handleAssetRegistryApiError("listing asset registry types", e));
    }

    public async listSkills(): Promise<AgentSkillsResponse> {
        return this.httpClient()
            .get(AssetRegistryApi.endpointUrl("skills"))
            .catch((e) => handleAssetRegistryApiError("listing asset registry skills", e));
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

    public async validate(assetType: string, body: any): Promise<any> {
        return this.httpClient()
            .post(AssetRegistryApi.endpointUrl("validate", encodeURIComponent(assetType)), body)
            .catch((e) => handleAssetRegistryApiError(`validating asset type '${assetType}'`, e));
    }

    public async getSkillFile(skillPath: string, filePath?: string): Promise<Buffer> {
        const operation = filePath
            ? `getting skill file '${filePath}' for '${skillPath}'`
            : `getting SKILL.md for '${skillPath}'`;
        const url = this.buildSkillFileUrl(skillPath, filePath);
        return this.httpClient()
            .getFile(url)
            .catch((e) => handleAssetRegistryApiError(operation, e));
    }

    private buildSkillFileUrl(skillPath: string, filePath?: string): string {
        const segments = ["skills", encodePathSegments(skillPath)];
        if (filePath) {
            segments.push(encodePathSegments(filePath));
        }
        return AssetRegistryApi.endpointUrl(...segments);
    }

    private static endpointUrl(...parts: string[]): string {
        return `${AssetRegistryApi.BASE_URL}/${path.join(...parts)}`;
    }
}

function encodePathSegments(value: string): string {
    return trimSlashes(value).split("/").map(encodeURIComponent).join("/");
}
