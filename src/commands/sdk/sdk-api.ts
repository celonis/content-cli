import { HttpClient } from "../../core/http/http-client";
import { Context } from "../../core/command/cli-context";
import { FatalError } from "../../core/utils/logger";

export class SdkApi {
    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async downloadSdk(appId: string): Promise<Buffer> {
        return this.httpClient()
            .getFile(`/pro-code-app-manager/api/npm/@celonis-sdk/${appId}/-/${appId}-latest.tgz`)
            .catch((e) => {
                const problem = `Problem downloading SDK for app ${appId}`;
                throw new FatalError(e ? `${problem}: ${e}` : problem);
            });
    }
}
