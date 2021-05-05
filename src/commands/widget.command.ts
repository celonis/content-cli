import { ContentService } from "../services/content.service";
import { WidgetManagerFactory } from "../content/factory/widget-manager.factory";

export class WidgetCommand {
    private contentService = new ContentService();
    private widgetManagerFactory = new WidgetManagerFactory();

    public async pushWidget(
        profile: string,
        tenantIndependent: boolean,
        userSpecific: boolean,
        activate: boolean
    ): Promise<void> {
        await this.contentService.push(
            profile,
            this.widgetManagerFactory.createManager(tenantIndependent, userSpecific, activate)
        );
    }
}
