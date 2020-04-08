import { ContentService } from "../services/content.service";
import { WidgetManagerFactory } from "../content/factory/widget-manager.factory";
import { ProfileService } from "../services/profile.service";

export class WidgetCommand {
    private contentService = new ContentService();
    private widgetManagerFactory = new WidgetManagerFactory();
    private profileService = new ProfileService();

    public async pushWidget(profile: string, teamUrl: string, apiKey: string) {
        const shouldCreateTempProfile = !profile && teamUrl && apiKey;
        if (shouldCreateTempProfile) {
            const tempProfile = this.profileService.storeTempProfile(teamUrl, apiKey);
            profile = tempProfile.name;
        }
        await this.contentService.push(profile, this.widgetManagerFactory.createManager());
    }
}
