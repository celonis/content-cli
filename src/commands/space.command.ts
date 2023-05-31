import {ContentService} from "../services/content.service";
import {SpaceManagerFactory} from "../content/factory/space-manager.factory";

export class SpaceCommand {
    private contentService = new ContentService();
    private spaceManagerFactory = new SpaceManagerFactory();

    public async listSpaces(profile: string, jsonResponse: boolean): Promise<void> {
        if (jsonResponse) {
            await this.contentService.findAllAndExport(profile, this.spaceManagerFactory.createListManager(jsonResponse));
        } else {
            await this.contentService.findAll(profile, this.spaceManagerFactory.createListManager(jsonResponse));
        }
    }
}
