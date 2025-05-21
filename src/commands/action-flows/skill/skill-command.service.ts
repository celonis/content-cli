import { ContentService } from "../../../core/http/http-shared/content.service";
import { Context } from "../../../core/command/cli-context";
import { SkillManagerFactory } from "./skill.manager-factory";

export class SkillCommandService {
    private contentService = new ContentService();
    private skillManagerFactory: SkillManagerFactory;

    constructor(context: Context) {
        this.skillManagerFactory = new SkillManagerFactory(context);
    }

    public async pullSkill(profile: string, projectId: string, skillId: string): Promise<void> {
        await this.contentService.pull(this.skillManagerFactory.createManager(projectId, skillId, null));
    }

    public async pushSkill(profile: string, projectId: string, filename: string): Promise<void> {
        await this.contentService.push(this.skillManagerFactory.createManager(projectId, null, filename));
    }
}
