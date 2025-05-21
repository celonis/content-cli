import { Context } from "../../../core/command/cli-context";
import { ActionFlowService } from "./action-flow.service";

export class ActionFlowCommandService {

    private actionFlowService: ActionFlowService;

    constructor(context: Context) {
        this.actionFlowService = new ActionFlowService(context);
    }

    public async exportActionFlows(packageId: string, metadataFile: string): Promise<void> {
        await this.actionFlowService.exportActionFlows(packageId, metadataFile);
    }

    public async analyzeActionFlows(packageId: string, outputToJsonFile: boolean): Promise<void> {
        await this.actionFlowService.analyzeActionFlows(packageId, outputToJsonFile);
    }

    public async importActionFlows(packageId: string, filePath: string, dryRun: boolean, outputToJsonFile: boolean): Promise<void> {
        await this.actionFlowService.importActionFlows(packageId, filePath, dryRun, outputToJsonFile);
    }
}