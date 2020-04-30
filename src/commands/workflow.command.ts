import { ContentService } from "../services/content.service";
import { WorkflowManagerFactory } from "../content/factory/workflow-manager.factory";

export class WorkflowCommand {
    private contentService = new ContentService();
    private workflowManagerFactory = new WorkflowManagerFactory();

    public async pullWorkflow(profile: string, id: string) {
        await this.contentService.pull(profile, this.workflowManagerFactory.createManager(id));
    }

    public async pushWorkflow(profile: string, fileName: string) {
        await this.contentService.push(profile, this.workflowManagerFactory.createManager(null, fileName));
    }

    public async pushWorkflows(profile: string) {
        await this.contentService.batchPush(profile, this.workflowManagerFactory.createManagers());
    }

    public async updateWorkflow(profile: string, id: string, fileName: string) {
        await this.contentService.update(profile, this.workflowManagerFactory.createManager(id, fileName));
    }
}
