import { ContentService } from "../services/content.service";
import { MetadataManagerFactory } from "../content/factory/metadata-manager.factory";
import { ProfileService } from "../services/profile.service";

export class MetadataConfigCommand {
    private contentService = new ContentService();
    private metadataManagerFactory = new MetadataManagerFactory();
    private profileService = new ProfileService();

    public async pullMetadataConfig(profile: string, id: string) {
        await this.contentService.pull(profile, this.metadataManagerFactory.createManager(id, null));
    }

    public async pushMetadataConfig(profile: string, filename: string) {
        await this.contentService.push(profile, this.metadataManagerFactory.createManager(null, filename));
    }

    public async pushMetadataConfigs(profile: string, teamUrl: string, apiKey: string) {
        const shouldCreateTempProfile = !profile && teamUrl && apiKey;
        if (shouldCreateTempProfile) {
            const tempProfile = this.profileService.storeTempProfile(teamUrl, apiKey);
            profile = tempProfile.name;
        }
        await this.contentService.batchPush(profile, this.metadataManagerFactory.createManagers());
    }

    public async updateMetadataConfig(profile: string, id: string, filename: string): Promise<any> {
        await this.contentService.update(profile, this.metadataManagerFactory.createManager(id, filename));
    }
}
