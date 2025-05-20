import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { SpaceTransport } from "../interfaces/space.interface";
import { FatalError } from "../../../core/utils/logger";

export class SpaceApi {

    private httpClient: HttpClient;

    constructor(context: Context) {
        this.httpClient = context.httpClient;
    }

    public async findOne(spaceId: string): Promise<SpaceTransport> {
        return this.httpClient.get(`/package-manager/api/spaces/${spaceId}`).catch(e => {
            throw new FatalError(`Problem getting space: ${spaceId} ${e}`);
        });
    }

    public async findAllSpaces(): Promise<SpaceTransport[]> {
        return this.httpClient.get("/package-manager/api/spaces").catch(e => {
            throw new FatalError(`Problem getting spaces: ${e}`);
        });
    }

    public async createSpace(space: SpaceTransport): Promise<SpaceTransport> {
        return this.httpClient.post("/package-manager/api/spaces", space).catch(e => {
            throw new FatalError(`Problem space creation: ${e}`);
        });
    }
}
