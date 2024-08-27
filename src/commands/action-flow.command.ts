import { actionFlowService } from "../services/action-flow/action-flow-service";

export class ActionFlowCommand {

    public async exportActionFlows(packageId: string, metadataFile: string): Promise<void> {
        await actionFlowService.exportActionFlows(packageId, metadataFile);
    }

    public async analyzeActionFlows(packageId: string, outputToJsonFile: boolean): Promise<void> {
        await actionFlowService.analyzeActionFlows(packageId, outputToJsonFile);
    }

    public async importActionFlows(packageId: string, filePath: string, dryRun: boolean, outputToJsonFile: boolean): Promise<void> {
        await actionFlowService.importActionFlows(packageId, filePath, dryRun, outputToJsonFile);
    }
}