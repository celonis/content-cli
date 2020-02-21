import { ContentService } from "../services/content.service";
import { MetadataManagerFactory } from "../content/factory/metadata-manager.factory";

export class MetadataConfigCommand {
    private contentService = new ContentService();
    private metadataManagerFactory = new MetadataManagerFactory();

    public async pullMetadataConfig(profile: string, id: string) {
        await this.contentService.pull(profile, this.metadataManagerFactory.createManager(id, null));
    }

    public async pushMetadataConfig(profile: string, filename: string) {
        await this.contentService.push(profile, this.metadataManagerFactory.createManager(null, filename));
    }

    public async updateMetadataConfig(profile: string, id: string, filename: string): Promise<any> {
        await this.contentService.update(profile, this.metadataManagerFactory.createManager(id, filename));
    }
}
