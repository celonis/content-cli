import { VariableService } from "./variable.service";
import { Context } from "../../core/command/cli-context";

export class VariableCommandService {

    private variableService: VariableService;

    constructor(context: Context) {
        this.variableService = new VariableService(context);
    }

    public async listAssignments(variableType: string, jsonResponse: boolean, params: string): Promise<void> {
        if (jsonResponse) {
            await this.variableService.findAndExportCandidateAssignments(variableType, params);
        } else {
            await this.variableService.listCandidateAssignments(variableType, params);
        }
    }
}
