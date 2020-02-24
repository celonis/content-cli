import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { AnalysisManager } from "../manager/analysis.manager";

export class AnalysisManagerFactory {
    public createManager(id: string, filename: string): AnalysisManager {
        const analysisManager = new AnalysisManager();
        analysisManager.id = id;
        if (filename !== null) {
            analysisManager.content = this.readFile(filename);
        }
        return analysisManager;
    }

    private readFile(filename: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.readFileSync(path.resolve(process.cwd(), filename), { encoding: "utf-8" });
    }
}
