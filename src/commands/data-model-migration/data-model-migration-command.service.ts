import { Context } from "../../core/command/cli-context";
import { DataModelMigrationService } from "./service/data-model-migration.service";

export class DataModelMigrationCommandService {

    private readonly migrationService: DataModelMigrationService;

    constructor(context: Context) {
        this.migrationService = new DataModelMigrationService(context);
    }

    public async exportDataModel(poolId: string, dataModelId: string, outputToJsonFile: boolean): Promise<void> {
        await this.migrationService.exportDataModel(poolId, dataModelId, outputToJsonFile);
    }

    public async pushSemanticModel(options: {
        poolId: string;
        dataModelId: string;
        packageKey: string;
        schema?: string;
        namespace?: string;
        fromFile?: string;
        dryRun?: boolean;
        outputToJsonFile?: boolean;
    }): Promise<void> {
        await this.migrationService.pushSemanticModel(options);
    }
}
