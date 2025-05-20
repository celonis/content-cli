import * as fs from "fs";
import * as path from "path";
import { WidgetManager } from "./widget.manager";
import { FatalError, logger } from "../../../core/utils/logger";
import { Context } from "../../../core/command/cli-context";
import * as AdmZip from "adm-zip";
import { parse } from "../../../core/utils/yaml";

export class WidgetManagerFactory {

    private readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    public createManager(tenantIndependent: boolean = false, userSpecific: boolean = false): WidgetManager {
        const widgetManager = new WidgetManager(this.context);
        widgetManager.content = this.readContent();
        widgetManager.tenantIndependent = tenantIndependent;
        widgetManager.userSpecific = userSpecific;
        return widgetManager;
    }

    private readContent(): any {
        const manifest = this.fetchManifest();

        if (!manifest) {
            logger.error(new FatalError("Missing manifest file."));
        }

        this.validateManifest(manifest);

        const zip = new AdmZip();
        const zipFileName = path.resolve(process.cwd(), "output.zip");
        zip.addLocalFolder(path.resolve(process.cwd()));
        zip.writeZip(zipFileName);
        return fs.createReadStream(path.resolve(process.cwd(), "output.zip"));
    }

    public fetchManifest(): Manifest {
        if (fs.existsSync(path.resolve(process.cwd(), "manifest.yaml"))) {
            return parse(fs.readFileSync(path.resolve(process.cwd(), "manifest.yaml"), { encoding: "utf-8" }));
        }

        if (fs.existsSync(path.resolve(process.cwd(), "manifest.yml"))) {
            return parse(fs.readFileSync(path.resolve(process.cwd(), "manifest.yml"), { encoding: "utf-8" }));
        }

        return null;
    }

    public validateManifest(manifest: Manifest): void {
        if (!manifest.bundle) {
            logger.error(new FatalError("Missing 'bundle' attribute."));
        }

        if (!manifest.name) {
            logger.error(new FatalError("Missing 'name' attribute."));
        }

        if (!manifest.key) {
            logger.error(new FatalError("Missing 'key' attribute."));
        }

        if (!fs.existsSync(manifest.bundle)) {
            logger.error(new FatalError("Missing bundle."));
        }

        if (
            fs.existsSync(path.resolve(process.cwd(), "assets")) &&
            !fs.existsSync(path.resolve(process.cwd(), "assets", "widgets", manifest.key))
        ) {
            logger.error(
                new FatalError(
                    "Assets directory does not exist. Assets should live under 'assets/widgets/" + manifest.key + "'."
                )
            );
        }
    }
}

interface Manifest {
    key: string;
    name: string;
    bundle: string;
    version: string;
    externalResource: string;
    widgets: ManifestWidget[];
}

interface ManifestWidget {
    widgetId: string;
    name: string;
}
