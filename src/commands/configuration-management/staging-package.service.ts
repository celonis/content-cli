import { v4 as uuidv4 } from "uuid";
import { Context } from "../../core/command/cli-context";
import { PackageExportTransport } from "./interfaces/package-export.interfaces";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { StagingPackageApi } from "./api/staging-package-api";

export class StagingPackageService {

    private stagingPackageApi: StagingPackageApi;

    constructor(context: Context) {
        this.stagingPackageApi = new StagingPackageApi(context);
    }

    public async listStagingPackages(flavors: string[], includeBranches: boolean, jsonResponse: boolean): Promise<void> {
        const stagingPackages = await this.stagingPackageApi.findAllStagingPackages(flavors, includeBranches);
        if (jsonResponse) {
            this.exportListOfPackages(stagingPackages);
        } else {
            stagingPackages.forEach(pkg => {
                logger.info(`${pkg.name} - Key: "${pkg.key}"`);
            });
        }
    }

    private exportListOfPackages(packages: PackageExportTransport[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(packages), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }
}
