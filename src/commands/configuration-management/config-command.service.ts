import { Context } from "../../core/command/cli-context";
import { BatchImportExportService } from "./batch-import-export.service";
import { VariableService } from "./variable.service";
import { DiffService } from "./diff.service";
import { fileService } from "../../core/utils/file-service";

export class ConfigCommandService {

    private batchImportExportService: BatchImportExportService;
    private variableService: VariableService;
    private diffService: DiffService;

    constructor(context: Context) {
        this.batchImportExportService = new BatchImportExportService(context);
        this.variableService = new VariableService(context);
        this.diffService = new DiffService(context);
    }

    public async listActivePackages(jsonResponse: boolean, flavors: string[], withDependencies: boolean, packageKeys: string[], keysByVersion: string[], variableValue: string, variableType: string): Promise<void> {
        if (variableValue) {
            await this.listPackagesByVariableValue(jsonResponse, flavors, variableValue, variableType);
            return;
        }

        if (jsonResponse) {
            await this.batchImportExportService.findAndExportListOfActivePackages(flavors ?? [], packageKeys ?? [], keysByVersion ?? [], withDependencies);
        } else if (keysByVersion) {
            await this.batchImportExportService.listPackagesByKeysWithVersion(keysByVersion, withDependencies);
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

    public batchExportPackages(packageKeys: string[], packageKeysByVersion: string[], withDependencies: boolean, gitBranch: string, unzip: boolean): Promise<void> {
        return this.batchImportExportService.batchExportPackages(packageKeys, packageKeysByVersion, withDependencies, gitBranch, unzip);
    }

    public batchExportPackagesMetadata(packageKeys: string[], jsonResponse: boolean): Promise<void> {
        return this.batchImportExportService.batchExportPackagesMetadata(packageKeys, jsonResponse);
    }

    public batchImportPackages(file: string, directory: string, overwrite: boolean, gitBranch: string): Promise<void> {
        if ((directory || file) && gitBranch) {
            throw new Error("You cannot use both file/directory and gitBranch options at the same time. Only one import source can be defined.");
        }
        if (!directory && !file && !gitBranch) {
            throw new Error("You must provide either a file/directory or a gitBranch option to import packages.");
        }
        if (file && directory) {
            throw new Error("You cannot use both file and directory options at the same time. Only one import source can be defined.");
        }
        if (file && fileService.isDirectory(file)) {
            throw new Error("The file option accepts only zip files.");
        }
        if (directory && !fileService.isDirectory(directory)) {
            throw new Error("The directory option accepts only directories.");
        }
        const sourcePath = file ?? directory;
        return this.batchImportExportService.batchImportPackages(sourcePath, overwrite, gitBranch);
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
