import { ContentService } from "../../../core/http/http-shared/content.service";
import { Context } from "../../../core/command/cli-context";
import { AssetManagerFactory } from "../manager/asset.manager-factory";
import { AssetService } from "../service/asset-service";

export class AssetCommandService {
    private contentService = new ContentService();
    private assetManagerFactory: AssetManagerFactory;

    private assetService: AssetService;

    constructor(context: Context) {
        this.assetManagerFactory = new AssetManagerFactory(context);
        this.assetService = new AssetService(context);
    }

    public async pullAsset(key: string): Promise<void> {
        await this.contentService.pull(this.assetManagerFactory.createManager(key));
    }

    public async pushAsset(fileName: string, packageKey: string): Promise<void> {
        await this.contentService.push(this.assetManagerFactory.createManager(null, fileName, packageKey));
    }

    public async pushAssets(packageKey: string): Promise<void> {
        await this.contentService.batchPush(this.assetManagerFactory.createManagers(packageKey));
    }

    public async listAssets(jsonResponse: boolean, assetType: string): Promise<void> {
        if (jsonResponse) {
            await this.assetService.findAndExportAllAssets(assetType);
        } else {
            await this.assetService.listAssets(assetType);
        }
    }
}
