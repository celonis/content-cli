import * as fs from "fs";
import * as path from "path";
import {AnalysisBookmarksManager} from "./analysis-bookmarks.manager";
import {FatalError, logger} from "../../core/utils/logger";
import {Context} from "../../core/command/cli-context";

export class AnalysisBookmarksManagerFactory {
    private readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    public createAnalysisBookmarksManager(
        filename: string,
        analysisId: string,
        type?: string
    ): AnalysisBookmarksManager {
        const analysisBookmarksManager = new AnalysisBookmarksManager(this.context);
        analysisBookmarksManager.analysisId = analysisId;
        if (type === undefined || type === null) {
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
