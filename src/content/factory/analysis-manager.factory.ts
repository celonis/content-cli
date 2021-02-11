import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { AnalysisManager } from "../manager/analysis.manager";

export class AnalysisManagerFactory {
    public createManager(id: string, processId: string, filename: string, packageManager?: boolean): AnalysisManager {
        const analysisManager = new AnalysisManager();
        analysisManager.id = id;
        analysisManager.processId = processId;
        if (filename !== null) {
            analysisManager.fileName = this.resolvePackageFilePath(filename);
        }
        analysisManager.packageManager = packageManager;

        return analysisManager;
    }

    private resolvePackageFilePath(fileName: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), fileName))) {
            logger.error(new FatalError("The provided file does not exist"));
        }
        return path.resolve(process.cwd(), fileName);
    }
}
