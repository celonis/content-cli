import {StudioDataModelTransport} from "../interfaces/package-manager.interfaces";
import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";

class ComputePoolApi {
    public static readonly INSTANCE = new ComputePoolApi();

    public async findAssignedDatamodels(packageKey: string): Promise<StudioDataModelTransport[]> {
        return httpClientV2.get(`/package-manager/api/compute-pools/data-models/assigned?packageKey=${packageKey}`)
            .catch(e=> {
                throw new FatalError(`Problem getting datamodels of package: ${e}`);
            });
    }
}

export const computePoolApi = ComputePoolApi.INSTANCE;