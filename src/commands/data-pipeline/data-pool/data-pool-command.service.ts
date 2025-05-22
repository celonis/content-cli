import { ContentService } from "../../../core/http/http-shared/content.service";
import { DataPoolManagerFactory } from "./data-pool-manager.factory";
import { Context } from "../../../core/command/cli-context";
import { DataPoolService } from "./data-pool-service";
import { logger } from "../../../core/utils/logger";

export class DataPoolCommandService {
    private contentService = new ContentService();
    private dataPoolManagerFactory: DataPoolManagerFactory;
    private dataPoolService: DataPoolService;

    constructor(context: Context) {
        this.dataPoolManagerFactory = new DataPoolManagerFactory(context);
        this.dataPoolService = new DataPoolService(context);
    }

    public async pullDataPool(id: string): Promise<void> {
        await this.contentService.pull(this.dataPoolManagerFactory.createManager(id, null));
    }

    public async pushDataPool(filename: string): Promise<void> {
        await this.contentService.push(this.dataPoolManagerFactory.createManager(null, filename));
    }

    public async exportDataPool(poolId: string, outputToJsonFile: boolean): Promise<void> {
        await this.dataPoolService.exportDataPool(poolId, outputToJsonFile);
    }

    public async pushDataPools(): Promise<void> {
        await this.contentService.batchPush(this.dataPoolManagerFactory.createManagers());
    }

    public async batchImportDataPools(requestFile: string, outputToJsonFile: boolean): Promise<void> {
        await this.dataPoolService.batchImportDataPools(requestFile, outputToJsonFile);
    }

    public async updateDataPool(id: string, filename: string): Promise<any> {
        await this.contentService.update(this.dataPoolManagerFactory.createManager(id, filename));
    }

    public async listDataPools(jsonResponse: boolean): Promise<any> {
        logger.info(jsonResponse);
        if (jsonResponse) {
            await this.dataPoolService.findAndExportAllPools();
        } else {
            await this.dataPoolService.listDataPools();
        }
    }
}
