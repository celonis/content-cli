import * as FormData from "form-data";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import {
    GetNodeDiffRequest,
    GetNodeDiffWithFileRequest,
    NodeConfigurationDiffTransport,
} from "../interfaces/node-diff.interfaces";
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

    public async diffWithFile(request: GetNodeDiffWithFileRequest): Promise<NodeConfigurationDiffTransport> {
        const queryParams = new URLSearchParams();
        queryParams.set("baseVersion", request.baseVersion);

        const formData = new FormData();
        formData.append("file", request.file);

        return this.httpClient()
            .postFile(
                `/pacman/api/core/packages/${request.packageKey}/nodes/${request.nodeKey}/diff/configuration/with-file?${queryParams.toString()}`,
                formData,
            )
            .catch(exception => {
                throw new FatalError(`Problem getting the node diff: ${exception}`);
            });
    }
}
