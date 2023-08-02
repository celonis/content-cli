import { dataPoolApi } from "../../api/data-pool-api";
import { logger } from "../../util/logger";
import { v4 as uuidv4 } from "uuid";
import { FileService, fileService } from "../file-service";
import { DataPoolSlimTransport } from "../../interfaces/data-pool-manager.interfaces";

class DataPoolService {
    public async batchImportDataPools(requestFilePath: string, outputToJsonFile: boolean): Promise<void> {
        const requestFileContent: string = fileService.readFile(requestFilePath);
        const importReport = await dataPoolApi.executeDataPoolsBatchImport(requestFileContent);
        const importReportString = JSON.stringify(importReport, null, 4);

        logger.info("Data Pools batch import succeeded!");
        if (outputToJsonFile) {
            const reportFileName = "batch_import_report_" + uuidv4() + ".json";
            fileService.writeToFileWithGivenName(importReportString, reportFileName);
            logger.info("Batch import report file: " + reportFileName);
        } else {
            logger.info("Batch import report: \n" + importReportString);
        }
    }

    public async listDataPools(): Promise<void> {
        const dataPools = await this.findAllPools();
        dataPools.forEach(pool => {
            logger.info(`Pool Id: ${pool.id} - Pool Name: ${pool.name}`);
        });
    }

    public async findAndExportAllPools(): Promise<void> {
        const dataPools = await this.findAllPools();
        this.exportListOfPools(dataPools);
    }

    private async findAllPools(): Promise<DataPoolSlimTransport[]> {
        let page = 0;
        const dataPools: DataPoolSlimTransport[] = [];
        let tmpPage = await dataPoolApi.findAllPagedPools("100", page.toString());
        while (tmpPage.pageNumber < tmpPage.totalCount) {
            dataPools.push(...tmpPage.content);
            tmpPage = await dataPoolApi.findAllPagedPools("100", (++page).toString());
        }
        return dataPools;
    }

    private exportListOfPools(nodes: DataPoolSlimTransport[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(nodes), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }
}

export const dataPoolService = new DataPoolService();
