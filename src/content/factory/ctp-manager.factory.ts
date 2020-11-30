import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { Stream } from "stream";
import { CTPManager } from "../manager/ctp.manager";

export class CTPManagerFactory {
    public createManager(filename: string, password: string): CTPManager {
        const ctpManager = new CTPManager();
        ctpManager.password = password;
        if (filename !== null) {
            ctpManager.content = this.readFile(filename);
        }
        return ctpManager;
    }

    private readFile(filename: string): Stream {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.createReadStream(path.resolve(process.cwd(), filename));
    }
}
