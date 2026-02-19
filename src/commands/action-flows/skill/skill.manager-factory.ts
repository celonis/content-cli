import * as fs from "fs";
import * as path from "path";
import {Stream} from "stream";
import {Context} from "../../../core/command/cli-context";
import {FatalError, logger} from "../../../core/utils/logger";
import {SkillManager} from "./skill.manager";

export class SkillManagerFactory {
    private readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    public createManager(projectId: string, skillId: string, filename: string): SkillManager {
        const skillManager = new SkillManager(this.context);
        skillManager.skillId = skillId;
        skillManager.projectId = projectId;
        if (filename !== null) {
            skillManager.content = this.readFile(filename);
        }
        return skillManager;
    }

    private readFile(filename: string): Stream {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.createReadStream(path.resolve(process.cwd(), filename), {
            encoding: "binary",
        });
    }
}
