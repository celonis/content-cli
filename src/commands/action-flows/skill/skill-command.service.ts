import { Context } from "../../../core/command/cli-context";
import { SkillManagerFactory } from "./skill.manager-factory";

export class SkillCommandService {
    private skillManagerFactory: SkillManagerFactory;

    constructor(context: Context) {
        this.skillManagerFactory = new SkillManagerFactory(context);
    }

    public async pullSkill(profile: string, projectId: string, skillId: string): Promise<void> {
        await this.skillManagerFactory.createManager(projectId, skillId, null).pull();
    }

    public async pushSkill(profile: string, projectId: string, filename: string): Promise<void> {
        await this.skillManagerFactory.createManager(projectId, null, filename).push();
    }
}
