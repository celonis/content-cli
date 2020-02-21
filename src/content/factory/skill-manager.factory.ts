import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../util/logger";
import { SkillManager } from "../manager/skill.manager";
import { Stream } from "stream";

export class SkillManagerFactory {
    public createManager(projectId: string, skillId: string, filename: string): SkillManager {
        const metaDataManager = new SkillManager();
        metaDataManager.skillId = skillId;
        metaDataManager.projectId = projectId;
        if (filename !== null) {
            metaDataManager.content = this.readFile(filename);
        }
        return metaDataManager;
    }

    private readFile(filename: string): Stream {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.createReadStream(path.resolve(process.cwd(), filename), { encoding: "binary" });
    }
}
