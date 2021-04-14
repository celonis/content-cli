import { ContentService } from "../services/content.service";
import { DataPoolManagerFactory } from "../content/factory/data-pool-manager.factory";

export class DataPoolCommand {
    private contentService = new ContentService();
    private dataPoolManagerFactory = new DataPoolManagerFactory();

    public async pullDataPool(profile: string, id: string): Promise<void> {
        await this.contentService.pull(profile, this.dataPoolManagerFactory.createManager(id, null));
    }

    public async pushDataPool(profile: string, filename: string): Promise<void> {
        await this.contentService.push(profile, this.dataPoolManagerFactory.createManager(null, filename));
    }

    public async pushDataPools(profile: string): Promise<void> {
        await this.contentService.batchPush(profile, this.dataPoolManagerFactory.createManagers());
    }

    public async updateDataPool(profile: string, id: string, filename: string): Promise<any> {
        await this.contentService.update(profile, this.dataPoolManagerFactory.createManager(id, filename));
    }
}
