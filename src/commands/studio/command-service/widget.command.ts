import {execSync} from "child_process";
import {GracefulError, logger} from "../../../core/utils/logger";
import * as fs from "fs";
import * as path from "path";
import {Context} from "../../../core/command/cli-context";
import {WidgetManagerFactory} from "../manager/widget.manager-factory";

export class WidgetCommand {
    private widgetManagerFactory: WidgetManagerFactory;

    constructor(context: Context) {
        this.widgetManagerFactory = new WidgetManagerFactory(context);
    }

    public async pushWidget(tenantIndependent: boolean, userSpecific: boolean): Promise<void> {
        await this.widgetManagerFactory.createManager(tenantIndependent, userSpecific).push();
        await this.pushToAwsIfAuthorized();
    }

    private async pushToAwsIfAuthorized(): Promise<void> {
        if (process.env.AWS_ACCESS_KEY_ID_CDN && process.env.AWS_SECRET_ACCESS_KEY_CDN) {
            try {
                const dir = path.resolve(process.cwd());
                const pushToS3stdout = execSync(
                    `aws s3 cp ${dir} s3://celonis-static-origin/static/package-manager/ --recursive --exclude="*.map" --exclude="*.yaml" --profile default`
                ).toString("utf-8");
                logger.info(pushToS3stdout);
            } catch (error) {
                logger.error(new GracefulError(error.stderr?.toString() || error.message));
            }
        }

        const zipFileName = path.resolve(process.cwd(), "output.zip");
        fs.unlinkSync(zipFileName);
    }
}
