import { WidgetSourcemapsManagerFactory } from "../content/factory/widget-sourcemaps-manager.factory";

export class WidgetSourcemapsCommand {
    private widgetSourcemapsFactory = new WidgetSourcemapsManagerFactory();

    public async pushSourceMaps(): Promise<void> {
        await this.widgetSourcemapsFactory.createManager().push();
    }
}
