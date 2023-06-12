import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";
import {computePoolApi} from "../../api/compute-pool-api";

class DatamodelService {

    public static readonly INSTANCE = new DatamodelService();

    public async getDatamodelsForNodes(nodesListToExport: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const promises = [];

        nodesListToExport.forEach(node => {
            promises.push(new Promise(async resolve => {
                node.datamodels = await computePoolApi.findAssignedDatamodels(node.key);
                resolve(node);
            }));
        })

        return Promise.all(promises);
    }

}

export const dataModelService = DatamodelService.INSTANCE;