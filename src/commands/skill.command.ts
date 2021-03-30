import { ContentService } from "../services/content.service";
import { SkillManagerFactory } from "../content/factory/skill-manager.factory";

export class SkillCommand {
    private contentService = new ContentService();
    private skillManagerFactory = new SkillManagerFactory();

    public async pullSkill(profile: string, projectId: string, skillId: string): Promise<void> {
        await this.contentService.pull(profile, this.skillManagerFactory.createManager(projectId, skillId, null));
    }

    public async pushSkill(profile: string, projectId: string, filename: string): Promise<void> {
        await this.contentService.push(profile, this.skillManagerFactory.createManager(projectId, null, filename));
    }
}
