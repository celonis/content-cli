import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { MetadataManager } from "../manager/metadata.manager";

export class MetadataManagerFactory {
    public createManager(id: string, filename: string): MetadataManager {
        const metaDataManager = new MetadataManager();
        metaDataManager.id = id;
        if (filename !== null) {
            metaDataManager.content = this.readFile(filename);
        }
        return metaDataManager;
    }

    private readFile(filename: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.readFileSync(path.resolve(process.cwd(), filename), { encoding: "utf-8" });
    }
}
