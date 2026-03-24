import { Context } from "../../core/command/cli-context";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { v4 as uuidv4 } from "uuid";
import { PackageVersionApi } from "./api/package-version-api";
import {
    PackageVersionCreatedTransport,
    PackageVersionTransport,
    SavePackageVersionTransport,
    VersionBumpOption,
} from "./interfaces/package-version.interfaces";

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

    public async createPackageVersion(
        packageKey: string,
        version: string | undefined,
        versionBumpOption: string,
        summaryOfChanges: string | undefined,
        nodeFilterKeys: string[] | undefined,
        jsonResponse: boolean,
    ): Promise<void> {
        const request: SavePackageVersionTransport = {
            version: version,
            versionBumpOption: versionBumpOption as VersionBumpOption,
            summaryOfChanges: summaryOfChanges,
        };

        if (nodeFilterKeys && nodeFilterKeys.length > 0) {
            request.nodeFilter = {
                filterType: "INCLUDE",
                keys: nodeFilterKeys,
            };
        }

        const created: PackageVersionCreatedTransport = await this.packageVersionApi.createVersion(packageKey, request);

        if (jsonResponse) {
            const filename = uuidv4() + ".json";
            fileService.writeToFileWithGivenName(JSON.stringify(created, null, 2), filename);
            logger.info(FileService.fileDownloadedMessage + filename);
        } else {
            this.printPackageVersionCreatedTransport(created);
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

    private printPackageVersionCreatedTransport(transport: PackageVersionCreatedTransport): void {
        logger.info(`Successfully created version ${transport.version} for package ${transport.packageKey}`);
        logger.info(`Version: ${transport.version}`);
        logger.info(`Package Key: ${transport.packageKey}`);
        logger.info(`Summary of Changes: ${transport.summaryOfChanges}`);
        logger.info(`Creation Date: ${new Date(transport.creationDate).toISOString()}`);
        logger.info(`Created By: ${transport.createdBy}`);
    }
}
