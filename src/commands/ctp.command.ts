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
        await this.contentService.pushForm(profile, this.ctpManagerFactory.createManager(filename, password));
    }
}
