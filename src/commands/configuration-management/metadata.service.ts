import { v4 as uuidv4 } from "uuid";
import { Context } from "../../core/command/cli-context";
import { PackageMetadataExportTransport } from "./interfaces/package-export.interfaces";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { MetadataApi } from "./api/metadata-api";

export class MetadataService {

    private metadataApi: MetadataApi;

    constructor(context: Context) {
        this.metadataApi = new MetadataApi(context);
    }

    public async exportPackagesMetadata(packageKeys: string[], jsonResponse: boolean): Promise<void> {
        const exportedPackagesMetadata: PackageMetadataExportTransport[] = await this.metadataApi.exportPackagesMetadata(packageKeys);

        if (jsonResponse) {
            this.exportListOfPackagesMetadata(exportedPackagesMetadata);
        } else {
            exportedPackagesMetadata.forEach(pkg => {
                logger.info(`${pkg.key} - Has Unpublished Changes: ${pkg.hasUnpublishedChanges}`);
            });
        }
    }

    private exportListOfPackagesMetadata(packagesMetadata: PackageMetadataExportTransport[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(packagesMetadata), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }
}
