import { ContentService } from "../services/content.service";
import { CTPManagerFactory } from "../content/factory/ctp-manager.factory";
import { FatalError, logger } from "../util/logger";

export class CTPCommand {
    private contentService = new ContentService();
    private ctpManagerFactory = new CTPManagerFactory();

    public async pushCTPFile(
        profile: string,
        filename: string,
        password: string,
        pushAnalysis: boolean,
        pushDataModels: boolean,
        existingPoolId: string,
        globalPoolName: string
    ): Promise<void> {
        if (pushAnalysis) {
            await this.contentService.push(
                profile,
                this.ctpManagerFactory.createCtpAnalysisManager(filename, password)
            );
        }

        if (pushDataModels) {
            this.validateParamsForDataModelPush(existingPoolId, globalPoolName);
            await this.contentService.push(
                profile,
                this.ctpManagerFactory.createCtpDataModelManager(filename, password, existingPoolId, globalPoolName)
            );
        }
    }

    private validateParamsForDataModelPush(existingPoolId: string, globalPoolName: string): void {
        if (existingPoolId != null && globalPoolName != null) {
            logger.error(
                new FatalError(
                    "You should specify only one of those options --globalPoolName, --existingPoolId, they are mutual exclusive"
                )
            );
        }
    }
}
