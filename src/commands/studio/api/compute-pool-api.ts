import {StudioComputeNodeDescriptor} from "../interfaces/package-manager.interfaces";
import {HttpClient} from "../../../core/http/http-client";
import {Context} from "../../../core/command/cli-context";

export class ComputePoolApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findAllDataModelsDetails(): Promise<StudioComputeNodeDescriptor[]> {
        return this.httpClient()
            .get("/package-manager/api/compute-pools/data-models/details")
            .catch(e => {
                return null;
            });
    }
}
