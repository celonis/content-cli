import {packageApi} from "../../api/package-api";
import {VariablesAssignments} from "../../interfaces/package-manager.interfaces";

class VariableService {

    public async getVariablesByNodeKey(): Promise<Map<string, VariablesAssignments[]>> {
        const nodeWithVariablesAssignments = await packageApi.findAllPackagesWithVariableAssignments();
        const variablesByNodeKey = new Map<string, VariablesAssignments[]>();

        nodeWithVariablesAssignments.forEach(nodeWithVariablesAssignment => {
            variablesByNodeKey.set(nodeWithVariablesAssignment.key, nodeWithVariablesAssignment.variableAssignments);
        })
        return variablesByNodeKey;
    }
}

export const variableService = new VariableService();
