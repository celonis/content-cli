import {packageApi} from "../../api/package-api";
import {VariablesAssignments} from "../../interfaces/package-manager.interfaces";
import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";

class VariableService {

    public async getVariablesByNodeKey(nodes: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const nodeWithVariablesAssignments = await packageApi.findAllPackagesWithVariableAssignments();

        nodes.forEach(node=> {
            node.variables = nodeWithVariablesAssignments.find(nodeWithVariablesAssignment=> nodeWithVariablesAssignment.key === node.key)?.variableAssignments;
        });

        return Promise.all(nodes);
    }
}

export const variableService = new VariableService();
