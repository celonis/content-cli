import { ContentService } from "../services/content.service";
import { ObjectiveManagerFactory } from "../content/factory/objective-manager.factory";

export class ObjectiveCommand {
    private contentService = new ContentService();
    private objectiveManagerFactory = new ObjectiveManagerFactory();

    public async pullObjective(profile: string, id: string) {
        await this.contentService.pull(profile, this.objectiveManagerFactory.createManager(id, null));
    }

    public async pushObjective(profile: string, filename: string) {
        await this.contentService.push(profile, this.objectiveManagerFactory.createManager(null, filename));
    }
}
