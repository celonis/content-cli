import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { ObjectiveManager } from "../manager/objective.manager";

export class ObjectiveManagerFactory {
    public createManager(id: string, filename: string): ObjectiveManager {
        const objectiveManager = new ObjectiveManager();
        objectiveManager.id = id;
        if (filename !== null) {
            objectiveManager.content = this.readFile(filename);
        }
        return objectiveManager;
    }

    private readFile(filename: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.readFileSync(path.resolve(process.cwd(), filename), { encoding: "utf-8" });
    }
}
