import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { CtpAnalysisManager } from "../manager/ctp.analysis.manager";
import { ReadStream } from "fs";
import { CtpManager } from "../manager/ctp.manager";
import { CtpDataModelManager } from "../manager/ctp.datamodel.manager";

export class CTPManagerFactory {
    public createCtpAnalysisManager(filename: string, password: string, spaceKey: string): CtpManager {
        const ctpManager = new CtpAnalysisManager();
        return this.initManager(ctpManager, filename, password, spaceKey);
    }

    public createCtpDataModelManager(
        filename: string,
        password: string,
        existingPoolId: string,
        globalPoolName: string
    ): CtpManager {
        const ctpManager = new CtpDataModelManager(existingPoolId, globalPoolName);
        return this.initManager(ctpManager, filename, password);
    }

    private initManager(ctpManager: CtpManager, filename: string, password: string, spaceKey?: string): CtpManager {
        ctpManager.password = password;
        ctpManager.spaceKey = spaceKey;
        if (filename !== null) {
            ctpManager.content = this.readFile(filename);
        }
        return ctpManager;
    }

    private readFile(filename: string): ReadStream {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.createReadStream(path.resolve(process.cwd(), filename));
    }
}
