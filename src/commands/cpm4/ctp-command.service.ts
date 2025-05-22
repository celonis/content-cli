import { Context } from "../../core/command/cli-context";
import { ContentService } from "../../core/http/http-shared/content.service";
import { FatalError, logger } from "../../core/utils/logger";
import { CTPManagerFactory } from "./ctp.manager-factory";

export class CTPCommandService {
    private contentService = new ContentService();
    private ctpManagerFactory: CTPManagerFactory;

    constructor(context: Context) {
        this.ctpManagerFactory = new CTPManagerFactory(context);
    }

    public async pushCTPFile(
        filename: string,
        password: string,
        pushAnalysis: boolean,
        pushDataModels: boolean,
        existingPoolId: string,
        globalPoolName: string,
        spaceKey: string
    ): Promise<void> {
        if (pushAnalysis) {
            await this.contentService.push(this.ctpManagerFactory.createCtpAnalysisManager(filename, password, spaceKey));
        }

        if (pushDataModels) {
            this.validateParamsForDataModelPush(existingPoolId, globalPoolName);
            await this.contentService.push(this.ctpManagerFactory.createCtpDataModelManager(filename, password, existingPoolId, globalPoolName));
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
