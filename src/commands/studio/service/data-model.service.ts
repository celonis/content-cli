import {PackageWithVariableAssignments, StudioComputeNodeDescriptor} from "../interfaces/package-manager.interfaces";
import {Context} from "../../../core/command/cli-context";
import {ComputePoolApi} from "../api/compute-pool-api";

export class DataModelService {
    private computePoolApi: ComputePoolApi;

    constructor(context: Context) {
        this.computePoolApi = new ComputePoolApi(context);
    }

    public async getDataModelDetailsForPackages(
        packagesWithDataModelVariables: PackageWithVariableAssignments[]
    ): Promise<Map<string, StudioComputeNodeDescriptor[]>> {
        const dataModelsMap = new Map<string, StudioComputeNodeDescriptor[]>();
        const allAvailableDataModels = await this.computePoolApi.findAllDataModelsDetails();

        for (const node of packagesWithDataModelVariables) {
            const variablesOfPackage = packagesWithDataModelVariables.find(
                nodeWithVariablesAssignment => nodeWithVariablesAssignment.key === node.key
            )?.variableAssignments;
            const dataModelIds = variablesOfPackage
                .filter(variable => variable.value)
                .map(variable => variable.value.toString());

            const assignedDataModels = allAvailableDataModels.filter(dataModel =>
                dataModelIds.includes(dataModel.dataModelId)
            );
            dataModelsMap.set(node.key, assignedDataModels);
        }
        return dataModelsMap;
    }
}
