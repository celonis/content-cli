import { ContentService } from "../services/content.service";
import { AnalysisManagerFactory } from "../content/factory/analysis-manager.factory";

export class AnalysisCommand {
    private contentService = new ContentService();
    private analysisManagerFactory = new AnalysisManagerFactory();

    public async pullAnalysis(profile: string, id: string, packageManager: boolean): Promise<void> {
        await this.contentService.pull(
            profile,
            this.analysisManagerFactory.createManager(id, null, null, packageManager)
        );
    }

    public async pushAnalysis(profile: string, workspaceId: string, filename: string): Promise<void> {
        await this.contentService.push(profile, this.analysisManagerFactory.createManager(null, workspaceId, filename));
    }
}
