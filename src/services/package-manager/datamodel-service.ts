import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";
import {computePoolApi} from "../../api/compute-pool-api";
import {StudioDataModelTransport} from "../../interfaces/package-manager.interfaces";

class DatamodelService {

    public static readonly INSTANCE = new DatamodelService();

    public async getDatamodelsForNodes(nodesListToExport: BatchExportNodeTransport[]): Promise<Map<string, StudioDataModelTransport[]>> {
        const dataModelsMap = new Map<string, StudioDataModelTransport[]>();

        for(const node of nodesListToExport) {
            const assignedDataModels = await computePoolApi.findAssignedDatamodels(node.key);
            dataModelsMap.set(node.key, assignedDataModels)
        }

        return dataModelsMap;
    }

}

export const dataModelService = DatamodelService.INSTANCE;