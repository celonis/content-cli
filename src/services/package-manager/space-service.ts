import {SpaceExportTransport} from "../../interfaces/save-space.interface";
import {spaceApi} from "../../api/space-api";
import {ContentNodeTransport} from "../../interfaces/package-manager.interfaces";
import {promises} from "fs";
import {logger} from "../../util/logger";
import {computePoolApi} from "../../api/compute-pool-api";
import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";

class SpaceService {
    public static readonly INSTANCE = new SpaceService();

    public async getParentSpaces(nodes: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const promises = [];

        nodes.forEach(node => {
            promises.push(new Promise(async resolve => {
                node.space = await spaceApi.findParentSpace(node.spaceId);
                resolve(node);
            }));
        })

        return Promise.all(promises);
    }
}

export const spaceService = SpaceService.INSTANCE;