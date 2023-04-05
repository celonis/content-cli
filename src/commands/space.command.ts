import { ContentService } from "../services/content.service";
import { SpaceManagerFactory } from "../content/factory/space-manager.factory";

export class SpaceCommand {
    private contentService = new ContentService();
    private spaceManagerFactory = new SpaceManagerFactory();

    public async listSpaces(profile: string): Promise<void> {
        await this.contentService.findAll(profile, this.spaceManagerFactory.createManager());
    }
}
