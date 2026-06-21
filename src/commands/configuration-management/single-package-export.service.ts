import * as fs from "node:fs";
import { Context } from "../../core/command/cli-context";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { GitService } from "../../core/git-profile/git/git.service";
import { SinglePackageExportApi } from "./api/single-package-export-api";
import { resolve } from "node:path";

export class SinglePackageExportService {

    private readonly singlePackageExportApi: SinglePackageExportApi;
    private readonly gitService: GitService;

    constructor(context: Context) {
        this.singlePackageExportApi = new SinglePackageExportApi(context);
        this.gitService = new GitService(context);
    }

    public async exportPackage(packageKey: string, zip: boolean, gitBranch: string): Promise<void> {
        const packageData = await this.singlePackageExportApi.exportPackage(packageKey);

        if (gitBranch) {
            await this.exportToGitBranch(packageData, gitBranch);
            return;
        }

        if (zip) {
            const fileName = `${packageKey}.zip`;
            fileService.writeBufferToFileWithGivenName(packageData, resolve(process.cwd(), fileName));
            logger.info(FileService.fileDownloadedMessage + fileName);
            return;
        }

        fileService.extractZipBufferToDirectory(packageData, packageKey);
        logger.info(`Successful export. Exported directory: ${packageKey}`);
    }

    private async exportToGitBranch(packageData: Buffer, gitBranch: string): Promise<void> {
        const extractedDirectory = fileService.extractZipBufferToTempDirectory(packageData);
        try {
            await this.gitService.pushToBranch(extractedDirectory, gitBranch);
            logger.info("Successfully exported package to branch: " + gitBranch);
        } finally {
            fs.rmSync(extractedDirectory, { recursive: true, force: true });
        }
    }
}
