import {Context} from "../../../core/command/cli-context";
import {AssetManagerFactory} from "../manager/asset.manager-factory";
import {AssetService} from "../service/asset-service";
import {BaseManagerHelper} from "../../../core/http/http-shared/base.manager.helper";

export class AssetCommandService {
    private baseManagerHelper = new BaseManagerHelper();
    private assetManagerFactory: AssetManagerFactory;

    private assetService: AssetService;

    constructor(context: Context) {
        this.assetManagerFactory = new AssetManagerFactory(context);
        this.assetService = new AssetService(context);
    }

    public async pullAsset(key: string): Promise<void> {
        await this.assetManagerFactory.createManager(key).pull();
    }

    public async pushAsset(fileName: string, packageKey: string): Promise<void> {
        await this.assetManagerFactory.createManager(null, fileName, packageKey).push();
    }

    public async pushAssets(packageKey: string): Promise<void> {
        const assetManagers = this.assetManagerFactory.createManagers(packageKey);
        await this.baseManagerHelper.batchPush(assetManagers);
    }

    public async listAssets(jsonResponse: boolean, assetType: string): Promise<void> {
        if (jsonResponse) {
            await this.assetService.findAndExportAllAssets(assetType);
        } else {
            await this.assetService.listAssets(assetType);
        }
    }
}
