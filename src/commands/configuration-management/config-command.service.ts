import { Context } from "../../core/command/cli-context";
import { BatchImportExportService } from "./batch-import-export.service";
import { VariableService } from "./variable.service";
import { DiffService } from "./diff.service";

export class ConfigCommandService {

    private batchImportExportService: BatchImportExportService;
    private variableService: VariableService;
    private diffService: DiffService;

    constructor(context: Context) {
        this.batchImportExportService = new BatchImportExportService(context);
        this.variableService = new VariableService(context);
        this.diffService = new DiffService(context);
    }

    public async listActivePackages(jsonResponse: boolean, flavors: string[], withDependencies: boolean, packageKeys: string[], variableValue: string, variableType: string): Promise<void> {
        if (variableValue) {
            await this.listPackagesByVariableValue(jsonResponse, flavors, variableValue, variableType);
            return;
        }

        if (jsonResponse) {
            await this.batchImportExportService.findAndExportListOfActivePackages(flavors ?? [], packageKeys ?? [], withDependencies)
        } else {
            await this.batchImportExportService.listActivePackages(flavors ?? []);
        }
    }

    public async listVariables(jsonResponse: boolean, keysByVersion: string[], keysByVersionFile: string): Promise<void> {
        if (jsonResponse) {
            await this.variableService.exportVariables(keysByVersion, keysByVersionFile);
        } else {
            await this.variableService.listVariables(keysByVersion, keysByVersionFile);
        }
    }

    public batchExportPackages(packageKeys: string[], packageKeysByVersion: string[], withDependencies: boolean = false): Promise<void> {
        return this.batchImportExportService.batchExportPackages(packageKeys, packageKeysByVersion, withDependencies);
    }

    public batchExportPackagesMetadata(packageKeys: string[], jsonResponse: boolean): Promise<void> {
        return this.batchImportExportService.batchExportPackagesMetadata(packageKeys, jsonResponse);
    }

    public batchImportPackages(file: string, overwrite: boolean): Promise<void> {
        return this.batchImportExportService.batchImportPackages(file, overwrite);
    }

    public diffPackages(file: string, hasChanges: boolean, jsonResponse: boolean): Promise<void> {
        return this.diffService.diffPackages(file, hasChanges, jsonResponse);
    }

    private async listPackagesByVariableValue(jsonResponse: boolean, flavors: string[], variableValue: string, variableType: string): Promise<void> {
        if (jsonResponse) {
            await this.batchImportExportService.findAndExportListOfActivePackagesByVariableValue(flavors ?? [], variableValue, variableType )
        } else {
            await this.batchImportExportService.listActivePackagesByVariableValue(flavors ?? [], variableValue, variableType);
        }
    }
}
