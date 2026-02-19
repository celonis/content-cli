import {HttpClient} from "../../../core/http/http-client";
import {Context} from "../../../core/command/cli-context";
import {NodeDependencyTransport} from "../interfaces/node-dependency.interfaces";
import {FatalError} from "../../../core/utils/logger";

export class NodeDependencyApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findAllStaging(packageKey: string, nodeKey: string): Promise<NodeDependencyTransport[]> {
        return this.httpClient()
            .get(`/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}/dependencies`)
            .catch(e => {
                throw new FatalError(`Problem finding dependencies for node ${nodeKey} in package ${packageKey}: ${e}`);
            });
    }

    public async findAllByVersion(
        packageKey: string,
        nodeKey: string,
        version: string
    ): Promise<NodeDependencyTransport[]> {
        const queryParams = new URLSearchParams();
        queryParams.set("version", version);

        return this.httpClient()
            .get(`/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/dependencies?${queryParams.toString()}`)
            .catch(e => {
                throw new FatalError(
                    `Problem finding dependencies for node ${nodeKey} in package ${packageKey} for version ${version}: ${e}`
                );
            });
    }
}
