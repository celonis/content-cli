import { HttpClient } from "../../core/http/http-client";
import { Context } from "../../core/command/cli-context";
import { FatalError } from "../../core/utils/logger";

export interface SdkPublishResponse {
    version: string;
}

export class SdkApi {
    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async publishApp(appId: string, bundle: Buffer): Promise<SdkPublishResponse> {
        return this.httpClient()
            .postBinary(`/pro-code-app-manager/api/codespace/apps/${appId}/publish`, bundle, "application/zip")
            .catch((e) => {
                throw new FatalError(`Problem publishing app ${appId}: ${e}`);
            });
    }
}
