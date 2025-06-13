import { AnalysisBookmarksManagerFactory } from "./analysis-bookmarks.manager-factory";
import { Context } from "../../core/command/cli-context";

export class AnalysisBookmarksCommandService {
    private analysisBookmarksManagerFactory: AnalysisBookmarksManagerFactory;

    constructor(context: Context) {
        this.analysisBookmarksManagerFactory = new AnalysisBookmarksManagerFactory(context);
    }

    public async pullAnalysisBookmarks(analysisId: string, type: string): Promise<void> {
        await this.analysisBookmarksManagerFactory.createAnalysisBookmarksManager(null, analysisId, type).pull();
    }

    public async pushAnalysisBookmarks(analysisId: string, filename: string): Promise<void> {
        await this.analysisBookmarksManagerFactory.createAnalysisBookmarksManager(filename, analysisId).push();
    }
}
