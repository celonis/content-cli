import * as path from "path";
import { DataPoolManager } from "./data-pool.manager";
import { FatalError, logger } from "../../../core/utils/logger";
import * as fs from "node:fs";
import { Context } from "../../../core/command/cli-context";

export class DataPoolManagerFactory {

    private readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    public createManager(id: string, filename: string): DataPoolManager {
        const dataPoolManager = new DataPoolManager(this.context);
        dataPoolManager.id = id;
        if (filename !== null) {
            dataPoolManager.content = this.readFile(filename);
        }
        return dataPoolManager;
    }

    public createManagers(): DataPoolManager[] {
        const dataPools = fs.readdirSync(process.cwd());
        return dataPools
            .filter(filePath => {
                if (filePath.startsWith(DataPoolManager.DATA_POOL_FILE_NAME_PREFIX) && filePath.endsWith(".json")) {
                    const file = fs.lstatSync(filePath);
                    return file.isFile();
                }
                return false;
            })
            .map(dataPool => {
                const dataPoolManager = new DataPoolManager(this.context);
                dataPoolManager.content = this.readFile(dataPool);
                return dataPoolManager;
            });
    }

    private readFile(filename: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.readFileSync(path.resolve(process.cwd(), filename), { encoding: "utf-8" });
    }
}
