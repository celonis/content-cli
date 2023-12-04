import {variableService} from "../services/package-manager/variable-service";

export class VariableCommand {

    public async listAssignments(variableType: string, jsonResponse: boolean, params: string): Promise<void> {
        if (jsonResponse) {
            await variableService.findAndExportCandidateAssignments(variableType, params);
        } else {
            await variableService.listCandidateAssignments(variableType, params);
        }
    }
}
