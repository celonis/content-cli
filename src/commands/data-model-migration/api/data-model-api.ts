import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";
import { HttpClient } from "../../../core/http/http-client";
import { DataModelTransport } from "../interfaces/data-model-transport.interfaces";

export class DataModelApi {

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    /** Fetches the full data model transport including columns from cloud-data-integration. */
    public async findOneTransport(poolId: string, dataModelId: string, includeColumns = true): Promise<DataModelTransport> {
        const query = includeColumns ? "?includeColumns=true" : "";
        return this.httpClient()
            .get(`/integration/api/pools/${poolId}/data-models/${dataModelId}/transport${query}`)
            .catch((error) => {
                throw new FatalError(`Data model export failed for pool ${poolId}, data model ${dataModelId}: ${error}`);
            });
    }
}
