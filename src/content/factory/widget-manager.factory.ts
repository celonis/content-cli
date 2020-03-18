import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import * as YAML from "yaml";
import { WidgetManager } from "../manager/widget.manager";

const AdmZip = require("adm-zip");

interface Manifest {
    key: string;
    name: string;
    bundle: string;
    externalResource: string;
    widgets: ManifestWidget[];
}

interface ManifestWidget {
    widgetId: string;
    name: string;
}

export class WidgetManagerFactory {
    public createManager(): WidgetManager {
        const widgetManager = new WidgetManager();
        widgetManager.content = this.readContent();
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

        if (fs.existsSync(path.resolve(process.cwd(), "assets"))) {
            zip.addLocalFolder(path.resolve(process.cwd(), "assets"), "assets");
        }

        if (fs.existsSync(path.resolve(process.cwd(), "manifest.yaml"))) {
            zip.addLocalFile(path.resolve(process.cwd(), "manifest.yaml"));
        } else {
            zip.addLocalFile(path.resolve(process.cwd(), "manifest.yml"));
        }
        zip.addLocalFile(path.resolve(process.cwd(), manifest.bundle));
        zip.writeZip(zipFileName);
        const stream = fs.createReadStream(path.resolve(process.cwd(), "output.zip"));
        fs.unlinkSync(zipFileName);
        return stream;
    }

    private fetchManifest(): Manifest {
        if (fs.existsSync(path.resolve(process.cwd(), "manifest.yaml"))) {
            return YAML.parse(fs.readFileSync(path.resolve(process.cwd(), "manifest.yaml"), { encoding: "utf-8" }));
        }

        if (fs.existsSync(path.resolve(process.cwd(), "manifest.yml"))) {
            return YAML.parse(fs.readFileSync(path.resolve(process.cwd(), "manifest.yml"), { encoding: "utf-8" }));
        }

        return null;
    }

    private validateManifest(manifest: Manifest) {
        if (!manifest.bundle) {
            logger.error(new FatalError("Missing 'bundle' attribute."));
        }

        if (!manifest.name) {
            logger.error(new FatalError("Missing 'name' attribute."));
        }

        if (!manifest.key) {
            logger.error(new FatalError("Missing 'key' attribute."));
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
