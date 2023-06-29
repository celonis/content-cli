import {spaceApi} from "../../api/space-api";
import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";

class SpaceService {
    public static readonly INSTANCE = new SpaceService();

    public async getParentSpaces(nodes: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const promises = [];

        nodes.forEach(node => {
            promises.push(new Promise(async resolve => {
                node.space = await spaceApi.findOne(node.spaceId);
                resolve(node);
            }));
        })

        return Promise.all(promises);
    }
}

export const spaceService = SpaceService.INSTANCE;