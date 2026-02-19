import { DataPoolManagerFactory } from "./data-pool-manager.factory";
import { Context } from "../../../core/command/cli-context";
import { DataPoolService } from "./data-pool-service";
import { BaseManagerHelper } from "../../../core/http/http-shared/base.manager.helper";

export class DataPoolCommandService {
  private baseManagerHelper = new BaseManagerHelper();
  private dataPoolManagerFactory: DataPoolManagerFactory;
  private dataPoolService: DataPoolService;

  constructor(context: Context) {
    this.dataPoolManagerFactory = new DataPoolManagerFactory(context);
    this.dataPoolService = new DataPoolService(context);
  }

  public async pullDataPool(id: string): Promise<void> {
    await this.dataPoolManagerFactory.createManager(id, null).pull();
  }

  public async pushDataPool(filename: string): Promise<void> {
    await this.dataPoolManagerFactory.createManager(null, filename).push();
  }

  public async exportDataPool(
    poolId: string,
    outputToJsonFile: boolean,
  ): Promise<void> {
    await this.dataPoolService.exportDataPool(poolId, outputToJsonFile);
  }

  public async pushDataPools(): Promise<void> {
    const dataPoolManagers = this.dataPoolManagerFactory.createManagers();
    await this.baseManagerHelper.batchPush(dataPoolManagers);
  }

  public async batchImportDataPools(
    requestFile: string,
    outputToJsonFile: boolean,
  ): Promise<void> {
    await this.dataPoolService.batchImportDataPools(
      requestFile,
      outputToJsonFile,
    );
  }

  public async updateDataPool(id: string, filename: string): Promise<any> {
    await this.dataPoolManagerFactory.createManager(id, filename).update();
  }

  public async listDataPools(jsonResponse: boolean): Promise<any> {
    if (jsonResponse) {
      await this.dataPoolService.findAndExportAllPools();
    } else {
      await this.dataPoolService.listDataPools();
    }
  }
}
