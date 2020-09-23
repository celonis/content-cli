import { ContentService } from "../services/content.service";
import { WorkflowManagerFactory } from "../content/factory/workflow-manager.factory";

export class WorkflowCommand {
    private contentService = new ContentService();
    private workflowManagerFactory = new WorkflowManagerFactory();

    public async pullWorkflow(profile: string, id: string, packageManager: boolean) {
        await this.contentService.pull(profile, this.workflowManagerFactory.createManager(id, null, packageManager));
    }

    public async pushWorkflow(profile: string, fileName: string, packageKey: string) {
        await this.contentService.push(
            profile,
            this.workflowManagerFactory.createManager(null, fileName, !!packageKey, packageKey)
        );
    }

    public async pushWorkflows(profile: string, packageKey: string) {
        await this.contentService.batchPush(profile, this.workflowManagerFactory.createManagers(packageKey));
    }

    public async updateWorkflow(profile: string, id: string, fileName: string) {
        await this.contentService.update(profile, this.workflowManagerFactory.createManager(id, fileName));
    }
}
