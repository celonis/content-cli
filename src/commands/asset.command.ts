import {ContentService} from "../services/content.service";
import {AssetManagerFactory} from "../content/factory/asset-manager.factory";
import {assetService} from "../services/package-manager/asset-service";

export class AssetCommand {
    private contentService = new ContentService();
    private assetManagerFactory = new AssetManagerFactory();

    public async pullAsset(profile: string, key: string): Promise<void> {
        await this.contentService.pull(profile, this.assetManagerFactory.createManager(key));
    }

    public async pushAsset(profile: string, fileName: string, packageKey: string): Promise<void> {
        await this.contentService.push(profile, this.assetManagerFactory.createManager(null, fileName, packageKey));
    }

    public async pushAssets(profile: string, packageKey: string): Promise<void> {
        await this.contentService.batchPush(profile, this.assetManagerFactory.createManagers(packageKey));
    }

    public async listAssets(profile: string, jsonResponse: boolean, assetType: string): Promise<void> {
        if (jsonResponse) {
            await assetService.findAndExportAllAssets(assetType);
        } else {
            await assetService.listAssets(assetType);
        }
    }
}
