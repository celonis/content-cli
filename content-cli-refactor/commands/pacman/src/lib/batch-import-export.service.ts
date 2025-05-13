import {Injectable} from "@nestjs/common";
import {BatchImportExportApi} from "./batch-import-export.api";
import {logger} from "nx/src/utils/logger";

@Injectable()
export class BatchImportExportService {

    private batchImportExportApi: BatchImportExportApi;

    constructor(batchImportExportApi: BatchImportExportApi) {
        this.batchImportExportApi = batchImportExportApi;
    }

    public async listActivePackages(flavors: string[]): Promise<void> {
        const activePackages = await this.batchImportExportApi.findAllActivePackages(flavors);
        activePackages.forEach(pkg => {
            logger.info(`${pkg.name} - Key: "${pkg.key}"`)
        });
    }
}
