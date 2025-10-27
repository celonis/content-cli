import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { NodeTransport } from "../interfaces/node.interfaces";
import { FatalError } from "../../../core/utils/logger";

export class NodeApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findStagingNodeByKey(packageKey: string, nodeKey: string, withConfiguration: boolean): Promise<NodeTransport> {
        const queryParams = new URLSearchParams();
        queryParams.set("withConfiguration", withConfiguration.toString());

        return this.httpClient()
            .get(`/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}?${queryParams.toString()}`)
            .catch((e) => {
                throw new FatalError(`Problem finding node ${nodeKey} in package ${packageKey}: ${e}`);
            });
    }
}

