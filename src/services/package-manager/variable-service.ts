import {packageApi} from "../../api/package-api";
import {PackageWithVariableAssignments, VariablesAssignments} from "../../interfaces/package-manager.interfaces";
import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";

class VariableService {

    public async getVariableAssignmentsForNodes(nodes: BatchExportNodeTransport[]): Promise<PackageWithVariableAssignments[]> {
        return await packageApi.findAllPackagesWithVariableAssignments();
    }
}

export const variableService = new VariableService();
