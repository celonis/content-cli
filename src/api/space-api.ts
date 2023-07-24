import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";
import {SpaceTransport} from "../interfaces/save-space.interface";

class SpaceApi {
    public static readonly INSTANCE = new SpaceApi();

    public async findOne(spaceId: string): Promise<SpaceTransport> {
        return httpClientV2.get(`/package-manager/api/spaces/${spaceId}`).catch(e => {
            throw new FatalError(`Problem getting space: ${spaceId} ${e}`);
        });
    }

    public async findAllSpaces(): Promise<SpaceTransport[]> {
        return httpClientV2.get("/package-manager/api/spaces").catch(e => {
            throw new FatalError(`Problem getting spaces: ${e}`);
        });
    }

    public async createSpace(space: SpaceTransport): Promise<SpaceTransport> {
        return httpClientV2.post("/package-manager/api/spaces", space).catch(e => {
            throw new FatalError(`Problem space creation: ${e}`);
        });
    }

}

export const spaceApi = SpaceApi.INSTANCE;
