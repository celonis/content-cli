import { v4 as uuidv4 } from "uuid";
import { FileService, fileService } from "../../../core/utils/file-service";
import { logger } from "../../../core/utils/logger";
import { DataPoolSlimTransport } from "./data-pool-manager.interfaces";
import { Context } from "../../../core/command/cli-context";
import { DataPoolApi } from "./data-pool-api";

export class DataPoolService {
  private dataPoolApi: DataPoolApi;

  constructor(context: Context) {
    this.dataPoolApi = new DataPoolApi(context);
  }

  public async batchImportDataPools(
    requestFilePath: string,
    outputToJsonFile: boolean,
  ): Promise<void> {
    const requestFileContent: string = fileService.readFile(requestFilePath);
    const importReport =
      await this.dataPoolApi.executeDataPoolsBatchImport(requestFileContent);
    const importReportString = JSON.stringify(importReport, null, 4);

    if (outputToJsonFile) {
      const reportFileName = "batch_import_report_" + uuidv4() + ".json";
      fileService.writeToFileWithGivenName(importReportString, reportFileName);
      logger.info("Batch import report file: " + reportFileName);
    } else {
      logger.info("Batch import report: \n" + importReportString);
    }
  }

  public async exportDataPool(
    poolId: string,
    outputToJsonFile: boolean,
  ): Promise<void> {
    const exportedDataPool = await this.dataPoolApi.exportDataPool(poolId);
    const exportedDataPoolString = JSON.stringify(exportedDataPool, null, 4);

    if (outputToJsonFile) {
      const reportFileName = uuidv4() + "_data_pool_" + poolId + ".json";
      fileService.writeToFileWithGivenName(
        exportedDataPoolString,
        reportFileName,
      );
      logger.info(FileService.fileDownloadedMessage + reportFileName);
    } else {
      logger.info("Exported Data Pool: \n" + exportedDataPoolString);
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
    let tmpPage = await this.dataPoolApi.findAllPagedPools(
      "100",
      page.toString(),
    );
    while (tmpPage.pageNumber < tmpPage.totalCount) {
      dataPools.push(...tmpPage.content);
      tmpPage = await this.dataPoolApi.findAllPagedPools(
        "100",
        (++page).toString(),
      );
    }
    return dataPools;
  }

  private exportListOfPools(nodes: DataPoolSlimTransport[]): void {
    const filename = uuidv4() + ".json";
    fileService.writeToFileWithGivenName(JSON.stringify(nodes), filename);
    logger.info(FileService.fileDownloadedMessage + filename);
  }
}
