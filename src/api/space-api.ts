import {
    ContentNodeTransport,
    PackageHistoryTransport,
    PackageWithVariableAssignments
} from "../interfaces/package-manager.interfaces";
import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";
import {SaveSpace, SpaceExportTransport} from "../interfaces/save-space.interface";

class SpaceApi {
    public static readonly INSTANCE = new SpaceApi();

    public async findParentSpace(spaceId: string): Promise<SpaceExportTransport> {
        return httpClientV2.get(`/package-manager/api/spaces/${spaceId}`).catch(e => {
            throw new FatalError(`Problem getting packages: ${e}`);
        });
    }

    public async findAllSpaces(): Promise<SaveSpace[]> {
        return httpClientV2.get("/package-manager/api/spaces").catch(e => {
            throw new FatalError(`Problem getting packages: ${e}`);
        });
    }

    public async createSpace(space: SaveSpace): Promise<SaveSpace> {
        return httpClientV2.post("/package-manager/api/spaces", space).catch(e => {
            throw new FatalError(`Problem getting packages: ${e}`);
        });
    }

}

export const spaceApi = SpaceApi.INSTANCE;
