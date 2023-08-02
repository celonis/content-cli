import {spaceApi} from "../../api/space-api";
import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";
import {SpaceTransport} from "../../interfaces/save-space.interface";
import {v4 as uuidv4} from "uuid";

class SpaceService {
    public static readonly INSTANCE = new SpaceService();

    private allSpaces: SpaceTransport[] = [];

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

    public async createSpace(spaceName: string, spaceIcon: string): Promise<SpaceTransport> {
        const newSpace = await spaceApi.createSpace({
            id: uuidv4(),
            name: spaceName,
            iconReference: spaceIcon
        });

        this.allSpaces.push(newSpace);
        return newSpace;
    }

    public async getAllSpaces(): Promise<SpaceTransport[]> {
        if (this.allSpaces.length) {
            return this.allSpaces;
        }
        return await spaceApi.findAllSpaces();
    }
}

export const spaceService = SpaceService.INSTANCE;