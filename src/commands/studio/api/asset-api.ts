import {SaveContentNode} from "../interfaces/save-content-node.interface";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";

export class AssetApi {

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findAllAssets(assetType: string): Promise<SaveContentNode[]> {
        return this.httpClient().get(this.getFindAllAssetsUrl(assetType)).catch(e => {
            throw new FatalError(`Problem getting assets: ${e}`);
        });
    }

    private getFindAllAssetsUrl(assetType: string): string {
        const findAllAssetsUrl = "/package-manager/api/nodes";
        if (assetType) {
            return `${findAllAssetsUrl}?assetType=${assetType}`;
        }
        return findAllAssetsUrl;
    }
}
