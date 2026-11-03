import { URLSearchParams } from "node:url";
import { HttpClient } from "../../core/http/http-client";
import { Context } from "../../core/command/cli-context";
import { FatalError } from "../../core/utils/logger";

export interface SdkPublishOptions {
    version?: string;
    message?: string;
}

export interface SdkPublishResponse {
    version: string;
}

export class SdkApi {
    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async publishApp(appId: string, bundle: Buffer, options: SdkPublishOptions): Promise<SdkPublishResponse> {
        const queryParams = new URLSearchParams();
        if (options.version) {
            queryParams.set("version", options.version);
        }
        if (options.message) {
            queryParams.set("message", options.message);
        }
        const query = queryParams.toString();
        const path = `/pro-code-app-manager/api/codespace/apps/${appId}/publish`;
        const url = query ? `${path}?${query}` : path;

        return this.httpClient()
            .postBinary(url, bundle, "application/zip")
            .catch(e => {
                throw new FatalError(`Problem publishing app ${appId}: ${e}`);
            });
    }
}
