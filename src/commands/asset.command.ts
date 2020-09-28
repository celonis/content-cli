import { ContentService } from "../services/content.service";
import { AssetManagerFactory } from "../content/factory/asset-manager.factory";

export class AssetCommand {
    private contentService = new ContentService();
    private assetManagerFactory = new AssetManagerFactory();

    public async pullAsset(profile: string, key: string) {
        await this.contentService.pull(profile, this.assetManagerFactory.createManager(key));
    }

    public async pushAsset(profile: string, fileName: string, packageKey: string) {
        await this.contentService.push(profile, this.assetManagerFactory.createManager(null, fileName, packageKey));
    }

    public async pushAssets(profile: string, packageKey: string) {
        await this.contentService.batchPush(profile, this.assetManagerFactory.createManagers(packageKey));
    }
}
