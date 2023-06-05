import {packageManagerApi, VariablesAssignments} from "../../api/package-manager-api";

class VariableService {

    public async getVariablesByNodeKey(): Promise<Map<string, VariablesAssignments[]>> {
        const nodeWithVariablesAssignments = await packageManagerApi.findAllPackagesWithVariableAssignments();
        const variablesByNodeKey = new Map<string, VariablesAssignments[]>();

        nodeWithVariablesAssignments.forEach(nodeWithVariablesAssignment => {
            variablesByNodeKey.set(nodeWithVariablesAssignment.key, nodeWithVariablesAssignment.variableAssignments);
        })
        return variablesByNodeKey;
    }
}

export const variableService = new VariableService();