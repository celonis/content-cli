import {computePoolApi} from "../../api/compute-pool-api";
import {
    PackageWithVariableAssignments,
    StudioComputeNodeDescriptor
} from "../../interfaces/package-manager.interfaces";

class DataModelService {
    public static readonly INSTANCE = new DataModelService();

    public async getDataModelDetailsForPackages(packagesWithDataModelVariables: PackageWithVariableAssignments[]): Promise<Map<string, StudioComputeNodeDescriptor[]>> {
        const dataModelsMap = new Map<string, StudioComputeNodeDescriptor[]>();
        const allAvailableDataModels = await computePoolApi.findAllDataModelsDetails();

        for (const node of packagesWithDataModelVariables) {
            const variablesOfPackage = packagesWithDataModelVariables.find(nodeWithVariablesAssignment => nodeWithVariablesAssignment.key === node.key)?.variableAssignments;
            const dataModelIds = variablesOfPackage.filter(variable => variable.value).map(variable => variable.value.toString());

            const assignedDataModels = allAvailableDataModels.filter(dataModel => dataModelIds.includes(dataModel.dataModelId));
            dataModelsMap.set(node.key, assignedDataModels);
        }
        return dataModelsMap;
    }
}

export const dataModelService = DataModelService.INSTANCE;