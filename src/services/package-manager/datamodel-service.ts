import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";
import {computePoolApi} from "../../api/compute-pool-api";
import {StudioDataModelTransport} from "../../interfaces/package-manager.interfaces";

class DatamodelService {

    public static readonly INSTANCE = new DatamodelService();

    public async getDatamodelsForNodes(nodesListToExport: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const promises = [];

        nodesListToExport.forEach(node => {
            promises.push(new Promise(async resolve => {
                node.datamodels = await this.findAssignedDatamodels(node.key);
                resolve(node);
            }));
        })

        return Promise.all(promises);
    }
    public async findAssignedDatamodels(nodeKey: string): Promise<StudioDataModelTransport[]> {
        return await computePoolApi.findAssignedDatamodels(nodeKey);
    }
}

export const dataModelService = DatamodelService.INSTANCE;