import {batchImportExportApi} from "../../api/batch-import-export-api";
import {logger} from "../../util/logger";
import {v4 as uuidv4} from "uuid";
import {PackageExportTransport} from "../../interfaces/package-export-transport";
import {FileService, fileService} from "../file-service";
import {studioService} from "../studio/studio.service";

class BatchImportExportService {

    public async listActivePackages(flavors: string[]): Promise<void> {
        const activePackages = await batchImportExportApi.findAllActivePackages(flavors);
        activePackages.forEach(pkg => {
            logger.info(`${pkg.name} - Key: "${pkg.key}"`)
        });
    }

    public async findAndExportListOfActivePackages(flavors: string[], packageKeys: string[], withDependencies: boolean): Promise<void> {
        let packagesToExport: PackageExportTransport[];

        if (packageKeys.length) {
            packagesToExport = await batchImportExportApi.findActivePackagesByKeys(packageKeys, withDependencies);
        } else  {
            packagesToExport = await batchImportExportApi.findAllActivePackages(flavors, withDependencies);
        }

        await studioService.setSpaceIdForStudioPackages(packagesToExport);

        if (withDependencies) {
            await studioService.setDataModelsForStudioPackages(packagesToExport);
        }

        this.exportListOfPackages(packagesToExport);
    }

    private exportListOfPackages(packages: PackageExportTransport[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(packages), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }
}

export const batchImportExportService = new BatchImportExportService();