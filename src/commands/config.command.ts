import {batchImportExportService} from "../services/package-manager/batch-import-export-service";
import {variableService} from "../services/package-manager/variable-service";
import {diffService} from "../services/package-manager/diff-service";

export class ConfigCommand {

    public async listActivePackages(jsonResponse: boolean, flavors: string[], withDependencies: boolean, packageKeys: string[], variableValue: string, variableType: string): Promise<void> {
        if (variableValue) {
            await this.listPackagesByVariableValue(jsonResponse, flavors, variableValue, variableType);
            return;
        }

        if (jsonResponse) {
            await batchImportExportService.findAndExportListOfActivePackages(flavors ?? [], packageKeys ?? [], withDependencies)
        } else {
            await batchImportExportService.listActivePackages(flavors ?? []);
        }
    }

    public async listVariables(jsonResponse: boolean, keysByVersion: string[], keysByVersionFile: string): Promise<void> {
        if (jsonResponse) {
            await variableService.exportVariables(keysByVersion, keysByVersionFile);
        } else {
            await variableService.listVariables(keysByVersion, keysByVersionFile);
        }
    }

    public batchExportPackages(packageKeys: string[], withDependencies: boolean = false): Promise<void> {
        return batchImportExportService.batchExportPackages(packageKeys, withDependencies);
    }

    public batchImportPackages(file: string, overwrite: boolean): Promise<void> {
        return batchImportExportService.batchImportPackages(file, overwrite);
    }

    public diffPackages(file: string, hasChanges: boolean, jsonResponse: boolean): Promise<void> {
        return diffService.diffPackages(file, hasChanges, jsonResponse);
    }

    private async listPackagesByVariableValue(jsonResponse: boolean, flavors: string[], variableValue:string, variableType:string): Promise<void> {
        if (jsonResponse) {
            await batchImportExportService.findAndExportListOfActivePackagesByVariableValue(flavors ?? [], variableValue, variableType )
        } else {
            await batchImportExportService.listActivePackagesByVariableValue(flavors ?? [], variableValue, variableType);
        }
    }
}