import { ContentService } from "../services/content.service";
import { DataPoolManagerFactory } from "../content/factory/data-pool-manager.factory";
import { dataPoolService } from "../services/data-pool/data-pool-service";

export class DataPoolCommand {
    private contentService = new ContentService();
    private dataPoolManagerFactory = new DataPoolManagerFactory();

    public async pullDataPool(profile: string, id: string): Promise<void> {
        await this.contentService.pull(profile, this.dataPoolManagerFactory.createManager(id, null));
    }

    public async pushDataPool(profile: string, filename: string): Promise<void> {
        await this.contentService.push(profile, this.dataPoolManagerFactory.createManager(null, filename));
    }

    public async exportDataPool(poolId: string, outputToJsonFile: boolean): Promise<void> {
        await dataPoolService.exportDataPool(poolId, outputToJsonFile);
    }

    public async pushDataPools(profile: string): Promise<void> {
        await this.contentService.batchPush(profile, this.dataPoolManagerFactory.createManagers());
    }

    public async batchImportDataPools(requestFile: string, outputToJsonFile: boolean): Promise<void> {
        await dataPoolService.batchImportDataPools(requestFile, outputToJsonFile);
    }

    public async updateDataPool(profile: string, id: string, filename: string): Promise<any> {
        await this.contentService.update(profile, this.dataPoolManagerFactory.createManager(id, filename));
    }

    public async listDataPools(profile: string, jsonResponse: boolean): Promise<any> {
        if (jsonResponse) {
            await dataPoolService.findAndExportAllPools();
        } else {
            await dataPoolService.listDataPools();
        }
    }
}
