import {StudioComputeNodeDescriptor} from "../interfaces/package-manager.interfaces";
import {httpClientV2} from "../services/http-client-service.v2";

class ComputePoolApi {
    public static readonly INSTANCE = new ComputePoolApi();

    public async findAllDataModelsDetails(): Promise<StudioComputeNodeDescriptor[]> {
        return httpClientV2.get("/package-manager/api/compute-pools/data-models/details")
            .catch(e => {
                return null;
            });
    }
}

export const computePoolApi = ComputePoolApi.INSTANCE;