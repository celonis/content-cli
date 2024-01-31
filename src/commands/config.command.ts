import {batchImportExportService} from "../services/package-manager/batch-import-export-service";
import {variableService} from "../services/package-manager/variable-service";

export class ConfigCommand {

    public async listActivePackages(jsonResponse: boolean, flavors: string[], withDependencies: boolean, packageKeys:string[]): Promise<void> {
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
}