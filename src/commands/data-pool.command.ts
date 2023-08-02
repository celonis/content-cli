import { ContentService } from "../services/content.service";
import { DataPoolManagerFactory } from "../content/factory/data-pool-manager.factory";
import { dataPoolService } from "../services/data-pool/data-pool-service";

export class DataPoolCommand {
    private contentService = new ContentService();
    private dataPoolManagerFactory = new DataPoolManagerFactory();

    public async pullDataPool(profile: string, id: string, pullVersion: number): Promise<void> {
        await this.contentService.pull(profile, this.dataPoolManagerFactory.createPullManager(id, null, pullVersion));
    }

    public async pushDataPools(profile: string): Promise<void> {
        await this.contentService.batchPush(profile, this.dataPoolManagerFactory.createManagers());
    }

    public async batchImportDataPools(requestFile: string, outputToJsonFile: boolean): Promise<void> {
        await dataPoolService.batchImportDataPools(requestFile, outputToJsonFile);
    }

    public async pushDataPool(profile: string, filename: string): Promise<void> {
        await this.contentService.push(profile, this.dataPoolManagerFactory.createPushManager(null, filename));
    }

    public async updateDataPool(profile: string, id: string, filename: string): Promise<any> {
        await this.contentService.update(profile, this.dataPoolManagerFactory.createBaseManager(id, filename));
    }

    public async listDataPools(profile: string, jsonResponse: boolean): Promise<any> {
        if (jsonResponse) {
            await dataPoolService.findAndExportAllPools();
        } else {
            await dataPoolService.listDataPools();
        }
    }
}
