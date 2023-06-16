import {httpClientV2} from "../services/http-client-service.v2";
import {SpaceTransport} from "../interfaces/package-manager.interfaces";
import {FatalError} from "../util/logger";

class SpaceApi {
    public static readonly INSTANCE = new SpaceApi();

    public findSpaceById(spaceId: string): Promise<SpaceTransport> {
        return httpClientV2.get(`/package-manager/api/spaces/${spaceId}`).catch(e => {
            throw new FatalError(`Could not find space ${spaceId}`);
        })
    }
}

export const spaceApi = SpaceApi.INSTANCE;