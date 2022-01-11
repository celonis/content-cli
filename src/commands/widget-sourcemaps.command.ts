import { ContentService } from "../services/content.service";
import { WidgetSourcemapsManagerFactory } from "../content/factory/widget-sourcemaps-manager.factory";

export class WidgetSourcemapsCommand {
    private contentService = new ContentService();
    private widgetManagerFactory = new WidgetSourcemapsManagerFactory();

    public async pushWidget(profile: string, tenantIndependent: boolean, userSpecific: boolean): Promise<void> {
        await this.contentService.push(
            profile,
            this.widgetManagerFactory.createManager(tenantIndependent, userSpecific)
        );
    }
}
