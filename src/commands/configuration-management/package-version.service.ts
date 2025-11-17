import { Context } from "../../core/command/cli-context";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { v4 as uuidv4 } from "uuid";
import { PackageVersionApi } from "./api/package-version-api";
import { PackageVersionTransport } from "./interfaces/package-version.interfaces";

export class PackageVersionService {
    private packageVersionApi: PackageVersionApi;

    constructor(context: Context) {
        this.packageVersionApi = new PackageVersionApi(context);
    }

    public async findPackageVersion(packageKey: string, version: string, jsonResponse: boolean): Promise<void> {
        const packageVersionTransport: PackageVersionTransport = await this.packageVersionApi.findOne(packageKey, version);
        if (jsonResponse) {
            const filename = uuidv4() + ".json";
            fileService.writeToFileWithGivenName(JSON.stringify(packageVersionTransport, null, 2), filename);
            logger.info(FileService.fileDownloadedMessage + filename);
        } else {
            this.printPackageVersionTransport(packageVersionTransport);
        }
    }

    private printPackageVersionTransport(packageVersionTransport: PackageVersionTransport): void {
        logger.info(`Package Key: ${packageVersionTransport.packageKey}`);
        logger.info(`Version: ${packageVersionTransport.version}`);
        logger.info(`History ID: ${packageVersionTransport.historyId}`);
        logger.info(`Change Date: ${new Date(packageVersionTransport.changeDate).toISOString()}`);
        logger.info(`Publish Date: ${new Date(packageVersionTransport.publishDate).toISOString()}`);
        logger.info(`Publish Message: ${packageVersionTransport.publishMessage}`);
        logger.info(`Deployed: ${packageVersionTransport.deployed}`);
        logger.info(`Published By: ${packageVersionTransport.publishedBy}`);
    }
}
