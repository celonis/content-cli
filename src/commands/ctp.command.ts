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
        isGlobalPool: boolean,
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
            this.validateParamsForDataModelPush(isGlobalPool, globalPoolName);
            await this.contentService.push(
                profile,
                this.ctpManagerFactory.createCtpDataModelManager(
                    filename,
                    password,
                    isGlobalPool,
                    existingPoolId,
                    globalPoolName
                )
            );
        }
    }

    private validateParamsForDataModelPush(isGlobalPool: boolean, globalPoolName: string): void {
        if (isGlobalPool && globalPoolName == null) {
            logger.error(new FatalError("You should specify the pool name along with --globalPool option"));
        }
    }
}
