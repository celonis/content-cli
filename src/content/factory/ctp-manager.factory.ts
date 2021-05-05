import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { CtpAnalysisManager } from "../manager/ctp.analysis.manager";
import { ReadStream } from "fs";
import { CtpManager } from "../manager/ctp.manager";
import { CtpDataModelManager } from "../manager/ctp.datamodel.manager";

export class CTPManagerFactory {
    public createCtpAnalysisManager(filename: string, password: string): CtpManager {
        const ctpManager = new CtpAnalysisManager();
        return this.initManager(ctpManager, filename, password);
    }

    public createCtpDataModelManager(
        filename: string,
        password: string,
        isGlobalPool: boolean,
        existingPoolId: string,
        globalPoolName: string
    ): CtpManager {
        const ctpManager = new CtpDataModelManager(existingPoolId, isGlobalPool, globalPoolName);
        return this.initManager(ctpManager, filename, password);
    }

    private initManager(ctpManager: CtpManager, filename: string, password: string): CtpManager {
        ctpManager.password = password;
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
