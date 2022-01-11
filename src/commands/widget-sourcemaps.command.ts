import { ContentService } from "../services/content.service";
import { WidgetSourcemapsManagerFactory } from "../content/factory/widget-sourcemaps-manager.factory";

export class WidgetSourcemapsCommand {
    private contentService = new ContentService();
    private widgetManagerFactory = new WidgetSourcemapsManagerFactory();

    public async pushSourceMaps(profile: string): Promise<void> {
        await this.contentService.push(profile, this.widgetManagerFactory.createManager());
    }
}
