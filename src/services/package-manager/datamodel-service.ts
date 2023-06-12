import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";
import {DataModelTransport, packageManagerApi} from "../../api/package-manager-api";

class DatamodelService {

    public static readonly INSTANCE = new DatamodelService();

    public async getDatamodelsForNodes(nodesListToExport: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const promises = [];

        nodesListToExport.forEach(node => {
            const datamodelIds: string[] = node.variables.filter(variable => variable.type === "DATA_MODEL").map(variable => variable.value as unknown as string);

            promises.push(new Promise(async resolve => {
                node.datamodels = await this.getDataDatamodelsByIds(node.key, datamodelIds);
                resolve(node);
            }));
        })

        return Promise.all(promises);
    }

    private async getDataDatamodelsByIds(packageKey: string, datamodelIds: string[]): Promise<DataModelTransport[]> {
        const promises = [];

        datamodelIds.forEach(datamodelId => {
            promises.push(new Promise(async resolve => {
                if (datamodelId) {
                    let datamodel;
                    try {
                        datamodel = await packageManagerApi.getDataModel(datamodelId, packageKey);
                    } catch (e) {
                        resolve();
                    }
                    resolve(datamodel);
                }
            }))
        })

        return Promise.all(promises);
    }
}

export const dataModelService = DatamodelService.INSTANCE;