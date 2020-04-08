import { ContentService } from "../services/content.service";
import { WidgetManagerFactory } from "../content/factory/widget-manager.factory";

export class WidgetCommand {
    private contentService = new ContentService();
    private widgetManagerFactory = new WidgetManagerFactory();

    public async pushWidget(profile: string) {
        await this.contentService.push(profile, this.widgetManagerFactory.createManager());
    }
}
