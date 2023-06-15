import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";
import {SaveContentNode} from "../interfaces/save-content-node.interface";

class AssetApi {
    public static readonly INSTANCE = new AssetApi();

    public async findAllAssets(assetType: string): Promise<SaveContentNode[]> {
        return httpClientV2.get(this.getFindAllAssetsUrl(assetType)).catch(e => {
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

export const assetApi = AssetApi.INSTANCE;