import * as fs from "node:fs";
import * as path from "node:path";
import AdmZip = require("adm-zip");
import { SdkApi } from "./sdk-api";
import { Context } from "../../core/command/cli-context";
import { FatalError, logger } from "../../core/utils/logger";
import { ProfileService } from "../../core/profile/profile.service";
import { Profile } from "../../core/profile/profile.interface";

export class SdkService {
    private readonly context: Context;
    private readonly sdkApi: SdkApi;

    constructor(context: Context) {
        this.context = context;
        this.sdkApi = new SdkApi(context);
    }

    public async publishApp(appId: string, dist: string, buildVersion?: string, message?: string): Promise<void> {
        const distDirectory = path.resolve(process.cwd(), dist);
        this.requireDirectory(distDirectory);

        const bundle = this.compressDirectory(distDirectory);
        const { version } = await this.sdkApi.publishApp(appId, bundle, { version: buildVersion, message });

        logger.info(`App published successfully as version '${version}'`);
    }

    public async printToken(): Promise<void> {
        const profile = this.requireProfile();
        const token = await new ProfileService().acquireSdkToken(profile);

        process.stdout.write(`${token}\n`);
    }

    private requireProfile(): Profile {
        if (!this.context.profile) {
            throw new FatalError("No profile provided. Please provide a profile to acquire a token for");
        }
        return this.context.profile;
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
