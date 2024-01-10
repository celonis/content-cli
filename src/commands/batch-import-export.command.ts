import {batchImportExportService} from "../services/package-manager/batch-import-export-service";

export class BatchImportExportCommand {

    public async listActivePackages(jsonResponse: boolean, flavors: string[], withDependencies: boolean, packageKeys:string[]): Promise<void> {
        if (jsonResponse) {
            await batchImportExportService.findAndExportListOfActivePackages(flavors ?? [], packageKeys ?? [], withDependencies)
        } else {
            await batchImportExportService.listActivePackages(flavors ?? []);
        }
    }
}