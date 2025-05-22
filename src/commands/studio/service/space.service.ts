import {v4 as uuidv4} from "uuid";
import { Context } from "../../../core/command/cli-context";
import { SpaceTransport } from "../interfaces/space.interface";
import { BatchExportNodeTransport } from "../interfaces/batch-export-node.interfaces";
import { SpaceApi } from "../api/space-api";

export class SpaceService {

    private allSpaces: SpaceTransport[] = [];

    private spaceApi: SpaceApi;

    constructor(context: Context) {
        this.spaceApi = new SpaceApi(context);
    }

    public async getParentSpaces(nodes: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const promises = [];

        nodes.forEach(node => {
            promises.push(new Promise(async resolve => {
                node.space = await this.spaceApi.findOne(node.spaceId);
                resolve(node);
            }));
        })

        return Promise.all(promises);
    }

    public async createSpace(spaceName: string, spaceIcon: string): Promise<SpaceTransport> {
        const newSpace = await this.spaceApi.createSpace({
            id: uuidv4(),
            name: spaceName,
            iconReference: spaceIcon
        });

        await this.refreshAndGetAllSpaces();
        this.allSpaces.push(newSpace);
        return newSpace;
    }

    public async refreshAndGetAllSpaces(): Promise<SpaceTransport[]> {
        if (this.allSpaces.length) {
            return this.allSpaces;
        }
        this.allSpaces = await this.spaceApi.findAllSpaces();
        return this.allSpaces;
    }
}
