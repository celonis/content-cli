import * as fs from "fs";
import * as path from "path";
import { SdkApi } from "./sdk-api";
import { Context } from "../../core/command/cli-context";
import { logger } from "../../core/utils/logger";

export class SdkService {
    public static readonly SDK_DIRECTORY = ".celonis-sdk";

    private sdkApi: SdkApi;

    constructor(context: Context) {
        this.sdkApi = new SdkApi(context);
    }

    public async downloadSdk(appId: string): Promise<void> {
        const sdk = await this.sdkApi.downloadSdk(appId);

        const sdkDirectory = path.resolve(process.cwd(), SdkService.SDK_DIRECTORY);
        fs.rmSync(sdkDirectory, { recursive: true, force: true });
        fs.mkdirSync(sdkDirectory, { recursive: true });

        const sdkFile = path.join(SdkService.SDK_DIRECTORY, `${appId}.tgz`);
        fs.writeFileSync(path.resolve(process.cwd(), sdkFile), sdk);

        logger.info(`SDK downloaded successfully: ${sdkFile}`);
    }
}
