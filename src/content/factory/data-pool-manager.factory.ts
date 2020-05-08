import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { DataPoolManager } from "../manager/data-pool.manager";

export class DataPoolManagerFactory {
    public createManager(id: string, filename: string): DataPoolManager {
        const dataPoolManager = new DataPoolManager();
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
                const dataPoolManager = new DataPoolManager();
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
