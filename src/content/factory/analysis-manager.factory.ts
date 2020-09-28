import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { AnalysisManager } from "../manager/analysis.manager";
import { Stream } from "stream";

export class AnalysisManagerFactory {
    public createManager(id: string, processId: string, filename: string, packageManager?: boolean): AnalysisManager {
        const analysisManager = new AnalysisManager();
        analysisManager.id = id;
        analysisManager.processId = processId;
        if (filename !== null) {
            analysisManager.content = this.readFile(filename);
        }
        analysisManager.packageManager = packageManager;

        return analysisManager;
    }

    private readFile(filename: string): Stream {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.createReadStream(path.resolve(process.cwd(), filename), { encoding: "binary" });
    }
}
