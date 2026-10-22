import * as fs from "node:fs";
import * as path from "node:path";
import AdmZip = require("adm-zip");
import { SdkApi } from "./sdk-api";
import { Context } from "../../core/command/cli-context";
import { FatalError, logger } from "../../core/utils/logger";

export class SdkService {
    public static readonly SDK_DIRECTORY = ".celonis-sdk";

    private readonly sdkApi: SdkApi;

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

    public async publishApp(appId: string, dist: string): Promise<void> {
        const distDirectory = path.resolve(process.cwd(), dist);
        this.requireDirectory(distDirectory);

        const bundle = this.compressDirectory(distDirectory);
        const { version } = await this.sdkApi.publishApp(appId, bundle);

        logger.info(`App published successfully as version '${version}'`);
    }

    private requireDirectory(directory: string): void {
        if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
            throw new FatalError(`The dist directory ${directory} does not exist or is no directory`);
        }
    }

    private compressDirectory(directory: string): Buffer {
        const zip = new AdmZip();
        zip.addLocalFolder(directory);
        return zip.toBuffer();
    }
}
