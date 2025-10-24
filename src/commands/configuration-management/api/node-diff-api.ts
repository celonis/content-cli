import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { GetNodeDiffRequest, NodeConfigurationDiffTransport } from "../interfaces/node-diff.interfaces";
import { FatalError } from "../../../core/utils/logger";

export class NodeDiffApi {

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async diff(request: GetNodeDiffRequest): Promise<NodeConfigurationDiffTransport> {
        const queryParams = new URLSearchParams();
        queryParams.set("baseVersion", request.baseVersion);
        queryParams.set("compareVersion", request.compareVersion);

        return this.httpClient()
            .get(`/pacman/api/core/packages/${request.packageKey}/nodes/${request.nodeKey}/diff/configuration?${queryParams.toString()}`)
            .catch(exception => {
                throw new FatalError(`Problem getting the node diff: ${exception}`);
            });
    }
}
