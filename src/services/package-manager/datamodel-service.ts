import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";
import {computePoolApi} from "../../api/compute-pool-api";
import {
    PackageManagerVariableType,
    StudioComputeNodeDescriptor
} from "../../interfaces/package-manager.interfaces";
import {variableService} from "./variable-service";

class DataModelService {
    public static readonly INSTANCE = new DataModelService();

    public async getDataModelDetailsForNodes(nodes: BatchExportNodeTransport[]): Promise<Map<string, StudioComputeNodeDescriptor[]>> {
        const dataModelsMap = new Map<string, StudioComputeNodeDescriptor[]>();
        const allAvailableDataModels = await computePoolApi.findAllDataModelsDetails();

        const packageWithVariableAssignments = await variableService.getVariableAssignmentsForNodes(PackageManagerVariableType.DATA_MODEL);

        for (const node of nodes) {
            const variablesOfPackage = packageWithVariableAssignments.find(nodeWithVariablesAssignment => nodeWithVariablesAssignment.key === node.key)?.variableAssignments;
            const dataModelIds = variablesOfPackage.filter(variable => variable.value).map(variable => variable.value.toString());

            const assignedDataModels = allAvailableDataModels.filter(dataModel => dataModelIds.includes(dataModel.dataModelId));
            dataModelsMap.set(node.key, assignedDataModels);
        }
        return dataModelsMap;
    }


}

export const dataModelService = DataModelService.INSTANCE;