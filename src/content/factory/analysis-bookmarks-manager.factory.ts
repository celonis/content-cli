import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { AnalysisBookmarksManager } from "../manager/analysis-bookmarks.manager";

export class AnalysisBookmarksManagerFactory {
    public createAnalysisBookmarksManager(
        filename: string,
        analysisId: string,
        type?: string
    ): AnalysisBookmarksManager {
        const analysisBookmarksManager = new AnalysisBookmarksManager();
        analysisBookmarksManager.analysisId = analysisId;
        if (type === "undefined" || type === null) {
            type = "user";
        }
        analysisBookmarksManager.type = type;
        if (filename !== null) {
            analysisBookmarksManager.fileName = this.readFile(filename);
        }
        return analysisBookmarksManager;
    }

    private readFile(fileName: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), fileName))) {
            logger.error(new FatalError("The provided file does not exist"));
        }
        return path.resolve(process.cwd(), fileName);
    }
}
