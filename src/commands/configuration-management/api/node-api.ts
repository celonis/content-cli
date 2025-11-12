import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { NodeTransport } from "../interfaces/node.interfaces";
import { FatalError } from "../../../core/utils/logger";
import { OffsetSearchResult } from "../interfaces/offset-search-result.interfaces";

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

    public async findVersionedNodeByKey(packageKey: string, nodeKey: string, version: string, withConfiguration: boolean): Promise<NodeTransport> {
        const queryParams = new URLSearchParams();
        queryParams.set("version", version);
        queryParams.set("withConfiguration", withConfiguration.toString());

        return this.httpClient()
            .get(`/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}?${queryParams.toString()}`)
            .catch((e) => {
                throw new FatalError(`Problem finding node ${nodeKey} in package ${packageKey} for version ${version}: ${e}`);
            });
    }

    public async findVersionedNodesByPackage(packageKey: string, version: string, withConfiguration: boolean, limit: number, offset: number): Promise<OffsetSearchResult<NodeTransport>> {
        const queryParams = new URLSearchParams();
        queryParams.set("version", version);
        queryParams.set("withConfiguration", withConfiguration.toString());

        if (limit) {
            queryParams.set("limit", limit.toString());
        }
        if (offset) {
            queryParams.set("offset", offset.toString());
        }
        return this.httpClient()
            .get(`/pacman/api/core/packages/${packageKey}/nodes?${queryParams.toString()}`)
            .catch((e) => {
                throw new FatalError(`Problem fetching nodes from package ${packageKey} for version ${version}: ${e}`);
            });
    }
}

