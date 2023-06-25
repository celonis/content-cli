import {
    ContentNodeTransport,
    PackageHistoryTransport,
    PackageWithVariableAssignments
} from "../interfaces/package-manager.interfaces";
import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";
import {SpaceExportTransport} from "../interfaces/save-space.interface";

class SpaceApi {
    public static readonly INSTANCE = new SpaceApi();

    public async findParentSpace(spaceId: string): Promise<SpaceExportTransport> {
        return httpClientV2.get(`/package-manager/api/spaces/${spaceId}`).catch(e => {
            throw new FatalError(`Problem getting packages: ${e}`);
        });
    }

}

export const spaceApi = SpaceApi.INSTANCE;
