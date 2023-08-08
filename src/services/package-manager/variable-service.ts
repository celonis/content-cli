import {packageApi} from "../../api/package-api";
import {
    PackageWithVariableAssignments,
    VariableDefinitionWithValue,
    VariablesAssignments
} from "../../interfaces/package-manager.interfaces";
import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";
import {variablesApi} from "../../api/variables-api";

class VariableService {

    public async getVariableAssignmentsForNodes(nodes: BatchExportNodeTransport[]): Promise<PackageWithVariableAssignments[]> {
        return await packageApi.findAllPackagesWithVariableAssignments();
    }

    public async assignVariableValues(packageKey: string, variablesAssignments: VariablesAssignments[]): Promise<void> {
        await variablesApi.assignVariableValues(packageKey, variablesAssignments);
    }
}

export const variableService = new VariableService();
