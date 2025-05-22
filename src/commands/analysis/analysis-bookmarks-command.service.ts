import { ContentService } from "../../core/http/http-shared/content.service";
import { AnalysisBookmarksManagerFactory } from "./analysis-bookmarks.manager-factory";
import { Context } from "../../core/command/cli-context";

export class AnalysisBookmarksCommandService {
    private contentService = new ContentService();
    private analysisBookmarksManagerFactory: AnalysisBookmarksManagerFactory;

    constructor(context: Context) {
        this.analysisBookmarksManagerFactory = new AnalysisBookmarksManagerFactory(context);
    }

    public async pullAnalysisBookmarks(analysisId: string, type: string): Promise<void> {
        await this.contentService.pull(this.analysisBookmarksManagerFactory.createAnalysisBookmarksManager(null, analysisId, type));
    }

    public async pushAnalysisBookmarks(analysisId: string, filename: string): Promise<void> {
        await this.contentService.push(this.analysisBookmarksManagerFactory.createAnalysisBookmarksManager(filename, analysisId));
    }
}
