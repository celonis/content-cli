import { Context } from "../../core/command/cli-context";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { SinglePackageExportApi } from "./api/single-package-export-api";
import { resolve } from "node:path";

export class SinglePackageExportService {

    private readonly singlePackageExportApi: SinglePackageExportApi;

    constructor(context: Context) {
        this.singlePackageExportApi = new SinglePackageExportApi(context);
    }

    public async exportPackage(packageKey: string, zip: boolean): Promise<void> {
        const packageData = await this.singlePackageExportApi.exportPackage(packageKey);

        if (zip) {
            const fileName = `${packageKey}.zip`;
            fileService.writeBufferToFileWithGivenName(packageData, resolve(process.cwd(), fileName));
            logger.info(FileService.fileDownloadedMessage + fileName);
            return;
        }

        fileService.extractZipBufferToDirectory(packageData, packageKey);
        logger.info(`Successful export. Exported directory: ${packageKey}`);
    }
}
