import { v4 as uuidv4 } from "uuid";
import { Context } from "../../core/command/cli-context";
import { PackageMetadataExportTransport } from "./interfaces/package-export.interfaces";
import { FileService } from "../../core/utils/file-service";
import { CuiFileService } from "../../core/utils/cui-file-service";
import { logger } from "../../core/utils/logger";
import { MetadataApi } from "./api/metadata-api";

export class MetadataService {

    private metadataApi: MetadataApi;
    private readonly cuiFileService: CuiFileService;

    constructor(context: Context) {
        this.metadataApi = new MetadataApi(context);
        this.cuiFileService = new CuiFileService(context);
    }

    public async exportPackagesMetadata(packageKeys: string[], jsonResponse: boolean): Promise<void> {
        const exportedPackagesMetadata: PackageMetadataExportTransport[] = await this.metadataApi.exportPackagesMetadata(packageKeys);

        if (jsonResponse) {
            await this.exportListOfPackagesMetadata(exportedPackagesMetadata);
        } else {
            exportedPackagesMetadata.forEach(pkg => {
                logger.info(`${pkg.key} - Has Unpublished Changes: ${pkg.hasUnpublishedChanges}`);
            });
        }
    }

    private async exportListOfPackagesMetadata(packagesMetadata: PackageMetadataExportTransport[]): Promise<void> {
        const filename = uuidv4() + ".json";
        const writtenFilename = await this.cuiFileService.writeToFileWithGivenName(JSON.stringify(packagesMetadata), filename);
        logger.info(FileService.fileDownloadedMessage + writtenFilename);
    }
}
