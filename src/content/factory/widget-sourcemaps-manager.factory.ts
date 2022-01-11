import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { WidgetSourcemapsManager } from "../manager/widget-sourcemaps.manager";
import { WidgetManagerFactory } from "./widget-manager.factory";

export class WidgetSourcemapsManagerFactory {
    private widgetManagerFactory = new WidgetManagerFactory();

    public createManager(tenantIndependent: boolean = false, userSpecific: boolean = false): WidgetSourcemapsManager {
        const widgetSourcemapsManager = new WidgetSourcemapsManager();
        const manifest = this.widgetManagerFactory.fetchManifest();

        if (!manifest) {
            logger.error(new FatalError("Missing manifest file."));
        }

        this.widgetManagerFactory.validateManifest(manifest);

        widgetSourcemapsManager.distPath = path.resolve(process.cwd());
        widgetSourcemapsManager.service = manifest.key;
        widgetSourcemapsManager.releaseVersion = manifest.version;
        return widgetSourcemapsManager;
    }
}
