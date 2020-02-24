import { ContentService } from "../services/content.service";
import { AnalysisManagerFactory } from "../content/factory/analysis-manager.factory";

export class AnalysisCommand {
    private contentService = new ContentService();
    private analysisManagerFactory = new AnalysisManagerFactory();

    public async pullAnalysis(profile: string, id: string) {
        await this.contentService.pull(profile, this.analysisManagerFactory.createManager(id, null));
    }
}
