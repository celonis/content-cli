import { ContentService } from "../services/content.service";
import { AnalysisBookmarksManagerFactory } from "../content/factory/analysis-bookmarks-manager.factory";

export class AnalysisBookmarksCommand {
    private contentService = new ContentService();
    private analysisBookmarksManagerFactory = new AnalysisBookmarksManagerFactory();

    public async pullAnalysisBookmarks(profile: string, analysisId: string, type: string): Promise<void> {
        await this.contentService.pull(
            profile,
            this.analysisBookmarksManagerFactory.createAnalysisBookmarksManager(null, analysisId, type)
        );
    }

    public async pushAnalysisBookmarks(profile: string, analysisId: string, filename: string): Promise<void> {
        await this.contentService.push(profile, this.analysisBookmarksManagerFactory.createAnalysisBookmarksManager(filename, analysisId));
    }
}
