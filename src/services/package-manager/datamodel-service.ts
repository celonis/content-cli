import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";
import {DataModelTransport} from "../../interfaces/package-manager.interfaces";
import {packageApi} from "../../api/package-api";

class DatamodelService {

    public static readonly INSTANCE = new DatamodelService();

    public async getDatamodelsForNodes(nodesListToExport: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const promises = [];

        nodesListToExport.forEach(node => {
            promises.push(new Promise(async resolve => {
                node.datamodels = await packageApi.findAssignedDatamodels(node.key);
                resolve(node);
            }));
        })

        return Promise.all(promises);
    }

}

export const dataModelService = DatamodelService.INSTANCE;