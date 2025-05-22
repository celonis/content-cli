import * as fs from "fs";
import * as path from "path";
import { ReadStream } from "fs";
import { Context } from "../../core/command/cli-context";
import { CtpAnalysisManager } from "./ctp.analysis.manager";
import { CtpDataModelManager } from "./ctp.datamodel.manager";
import { CtpManager } from "./ctp.manager";
import { FatalError, logger } from "../../core/utils/logger";

export class CTPManagerFactory {

    private readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    public createCtpAnalysisManager(filename: string, password: string, spaceKey: string): CtpManager {
        const ctpManager = new CtpAnalysisManager(this.context);
        return this.initManager(ctpManager, filename, password, spaceKey);
    }

    public createCtpDataModelManager(
        filename: string,
        password: string,
        existingPoolId: string,
        globalPoolName: string
    ): CtpManager {
        const ctpManager = new CtpDataModelManager(this.context, existingPoolId, globalPoolName);
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
