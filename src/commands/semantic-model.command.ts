import { ContentService } from "../services/content.service";
import { SemanticModelManagerFactory } from "../content/factory/semantic-model-manager.factory";

export class SemanticModelCommand {
    private contentService = new ContentService();
    private semanticModelManagerFactory = new SemanticModelManagerFactory();

    public async pullSemanticModel(profile: string, id: string) {
        await this.contentService.pull(profile, this.semanticModelManagerFactory.createManager(id, null));
    }

    public async pushSemanticModel(profile: string, filename: string) {
        await this.contentService.push(profile, this.semanticModelManagerFactory.createManager(null, filename));
    }

    public async pushSemanticModels(profile: string) {
        await this.contentService.batchPush(profile, this.semanticModelManagerFactory.createManagers());
    }

    public async updateSemanticModel(profile: string, id: string, filename: string): Promise<any> {
        await this.contentService.update(profile, this.semanticModelManagerFactory.createManager(id, filename));
    }
}
