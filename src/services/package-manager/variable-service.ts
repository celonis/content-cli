import {packageApi} from "../../api/package-api";
import {
    PackageManagerVariableType,
    PackageWithVariableAssignments,
    VariablesAssignments
} from "../../interfaces/package-manager.interfaces";
import {variablesApi} from "../../api/variables-api";

class VariableService {

    public async getVariableAssignmentsForNodes(type?: PackageManagerVariableType): Promise<PackageWithVariableAssignments[]> {
        return await packageApi.findAllPackagesWithVariableAssignments(type);
    }

    public async assignVariableValues(packageKey: string, variablesAssignments: VariablesAssignments[]): Promise<void> {
        await variablesApi.assignVariableValues(packageKey, variablesAssignments);
    }
}

export const variableService = new VariableService();
