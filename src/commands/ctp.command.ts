import { ContentService } from "../services/content.service";
import { CTPManagerFactory } from "../content/factory/ctp-manager.factory";

export class CTPCommand {
    private contentService = new ContentService();
    private ctpManagerFactory = new CTPManagerFactory();

    public async pushCTPFile(
        profile: string,
        filename: string,
        password: string,
        pushAnalysis: boolean,
        pushDataModels: boolean
    ) {
        if (pushAnalysis) {
            await this.contentService.push(
                profile,
                this.ctpManagerFactory.createCtpAnalysisManager(filename, password)
            );
        }

        if (pushDataModels) {
            await this.contentService.pushForm(
                profile,
                this.ctpManagerFactory.createCtpDataModelManager(filename, password)
            );
        }
    }
}
