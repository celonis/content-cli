import { exec } from "child_process";
import { GracefulError, logger } from "../../util/logger";
import { ManagerConfig } from "../../interfaces/manager-config.interface";
import { BaseManager } from "./base.manager";

export class WidgetSourcemapsManager extends BaseManager {
    public service: string;
    public releaseVersion: string;
    public distPath: string;

    public async push(): Promise<any> {
        return this.pushWidgetSourcemaps(`assets/widgets/${this.service}`, `assets/widgets/${this.service}`);
    }

    private async pushWidgetSourcemaps(sourcemapsPath: string, distPathPostfix: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!process.env.DATADOG_SITE) {
                logger.error(new GracefulError("Missing DATADOG_SITE"));
            } else if (!process.env.DATADOG_API_KEY) {
                logger.error(new GracefulError("Missing DATADOG_API_KEY"));
            }

            const datadogCiPath = require.resolve("@datadog/datadog-ci/dist/cli.js");
            const commandLines = [
                `node ${datadogCiPath} sourcemaps upload .`,
                `--service=package-manager`,
                `--release-version=1.0.0`,
                `--minified-path-prefix=/package-manager/`,
            ];

            const datadogCommandLine = commandLines.join(" ");
            exec(datadogCommandLine, (error, stdout) => {
                if (error) {
                    logger.error(new GracefulError(error.message));
                } else {
                    logger.info(new GracefulError(stdout));
                }

                return resolve(error || stdout);
            });
        });
    }

    protected getConfig(): ManagerConfig {
        return {};
    }

    protected getBody(): object {
        return {};
    }

    protected getSerializedFileContent(data: any): string {
        return "";
    }
}
