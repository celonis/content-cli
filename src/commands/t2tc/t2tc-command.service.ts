import { Context } from "../../core/command/cli-context";
import { fileService } from "../../core/utils/file-service";
import { T2tcPackageService } from "./t2tc-package.service";
import { DiffService } from "./diff.service";
import { StagingPackageService } from "../configuration-management/staging-package.service";

export class T2tcCommandService {

    private t2tcPackageService: T2tcPackageService;
    private diffService: DiffService;
    private stagingPackageService: StagingPackageService;

    constructor(context: Context) {
        this.t2tcPackageService = new T2tcPackageService(context);
        this.diffService = new DiffService(context);
        this.stagingPackageService = new StagingPackageService(context);
    }

    public async listPackages(
        jsonResponse: boolean,
        flavors: string[],
        withDependencies: boolean,
        packageKeys: string[],
        keysByVersion: string[],
        variableValue: string,
        variableType: string,
        includeBranches: boolean,
        staging: boolean): Promise<void> {
        if (staging) {
            await this.stagingPackageService.listStagingPackages(flavors ?? [], includeBranches, jsonResponse);
        } else if (variableValue) {
            await this.listPackagesByVariableValue(jsonResponse, flavors, variableValue, variableType, includeBranches);
        } else if (jsonResponse) {
            await this.t2tcPackageService.findAndExportListOfPackages(flavors ?? [], packageKeys ?? [], keysByVersion ?? [], withDependencies, includeBranches);
        } else if (keysByVersion) {
            await this.t2tcPackageService.listPackagesByKeysWithVersion(keysByVersion, withDependencies);
        } else {
            await this.t2tcPackageService.listActivePackages(flavors ?? [], includeBranches);
        }
    }

    public batchExportPackages(packageKeys: string[], packageKeysByVersion: string[], withDependencies: boolean, gitBranch: string, unzip: boolean): Promise<void> {
        return this.t2tcPackageService.batchExportPackages(packageKeys, packageKeysByVersion, withDependencies, gitBranch, unzip);
    }

    public batchImportPackages(file: string, directory: string, overwrite: boolean, gitBranch: string, performValidation: boolean = false): Promise<void> {
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
        return this.t2tcPackageService.batchImportPackages(sourcePath, overwrite, gitBranch, performValidation);
    }

    public diffPackages(file: string, hasChanges: boolean, baseVersion: string, jsonResponse: boolean): Promise<void> {
        return this.diffService.diffPackages(file, hasChanges, baseVersion, jsonResponse);
    }

    private async listPackagesByVariableValue(jsonResponse: boolean, flavors: string[], variableValue: string, variableType: string, includeBranches: boolean): Promise<void> {
        if (jsonResponse) {
            await this.t2tcPackageService.findAndExportListOfActivePackagesByVariableValue(flavors ?? [], variableValue, variableType, includeBranches)
        } else {
            await this.t2tcPackageService.listActivePackagesByVariableValue(flavors ?? [], variableValue, variableType, includeBranches);
        }
    }
}
