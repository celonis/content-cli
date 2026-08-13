import { v4 as uuidv4 } from "uuid";
import { Context } from "../../core/command/cli-context";
import { FatalError, logger } from "../../core/utils/logger";
import { fixConnectionVariables } from "./connection-variable.helper";
import { FileService, fileService } from "../../core/utils/file-service";
import { CuiFileService } from "../../core/utils/cui-file-service";
import { PackageKeyAndVersionPair, StagingVariableManifestTransport, VariableManifestTransport } from "./interfaces/package-export.interfaces";
import { VariableApi } from "./api/variable-api";
import { URLSearchParams } from "url";
import { VariableAssignmentCandidatesApi } from "./api/variable-assignment-candidates-api";
import { StagingPackageVariablesApi } from "./api/staging-package-variables-api";

export class VariableService {

    private variableApi: VariableApi;
    private variableAssignmentCandidatesApi: VariableAssignmentCandidatesApi;
    private readonly stagingPackageVariablesApi: StagingPackageVariablesApi;
    private readonly cuiFileService: CuiFileService;

    constructor(context: Context) {
        this.variableApi = new VariableApi(context);
        this.variableAssignmentCandidatesApi = new VariableAssignmentCandidatesApi(context);
        this.stagingPackageVariablesApi = new StagingPackageVariablesApi(context);
        this.cuiFileService = new CuiFileService(context);
    }

    public async listVariables(keysByVersion: string[], keysByVersionFile: string): Promise<void> {
        const variableManifests = await this.getVersionedVariablesByKeyVersionPairs(keysByVersion, keysByVersionFile);

        variableManifests.forEach(variableManifest => {
            logger.info(JSON.stringify(variableManifest));
        });
    }

    public async listCandidateAssignments(type: string, params: string): Promise<void> {
        const parsedParams = this.parseParams(params);
        const assignments = await this.variableAssignmentCandidatesApi.getCandidateAssignments(type, parsedParams);

        assignments.forEach(assignment => {
            logger.info(JSON.stringify(assignment));
        });
    }

    public async findAndExportCandidateAssignments(type: string, params: string): Promise<void> {
        const parsedParams = this.parseParams(params);
        const assignments = await this.variableAssignmentCandidatesApi.getCandidateAssignments(type, parsedParams);

        await this.exportToJson(assignments);
    }

    public async exportVariables(keysByVersion: string[], keysByVersionFile: string): Promise<void> {
        const variableManifests = await this.getVersionedVariablesByKeyVersionPairs(keysByVersion, keysByVersionFile);

        await this.exportToJson(variableManifests);
    }

    public async listStagingVariables(packageKeys: string[]): Promise<void> {
        const byPackage = await this.fetchStagingVariablesByPackageKeys(packageKeys);
        byPackage.forEach(entry => {
            logger.info(JSON.stringify(entry));
        });
    }

    public async exportStagingVariables(packageKeys: string[]): Promise<void> {
        const byPackage = await this.fetchStagingVariablesByPackageKeys(packageKeys);
        await this.exportToJson(byPackage);
    }

    private async fetchStagingVariablesByPackageKeys(
        packageKeys: string[]
    ): Promise<StagingVariableManifestTransport[]> {
        return await this.stagingPackageVariablesApi.findAllByPackageKeys(packageKeys);
    }

    private async getVersionedVariablesByKeyVersionPairs(keysByVersion: string[], keysByVersionFile: string): Promise<VariableManifestTransport[]> {
        const variablesExportRequest: PackageKeyAndVersionPair[] = this.buildKeyVersionPairs(keysByVersion, keysByVersionFile);

        const variableManifests = await this.variableApi.findVariablesWithValuesByPackageKeysAndVersion(variablesExportRequest);
        return fixConnectionVariables(variableManifests);
    }

    private buildKeyVersionPairs(keysByVersion: string[], keysByVersionFile: string): PackageKeyAndVersionPair[] {
        let variablesExportRequest: PackageKeyAndVersionPair[] = [];

        if (keysByVersion.length !== 0) {
            variablesExportRequest = this.buildKeyAndVersionPairsFromArrayInput(keysByVersion);
        } else if (keysByVersion.length === 0 && keysByVersionFile !== "") {
            variablesExportRequest = fileService.readFileToJson(keysByVersionFile);
        } else {
            throw new FatalError("Please provide keysByVersion mappings or file path!");
        }

        return variablesExportRequest;
    }

    private buildKeyAndVersionPairsFromArrayInput(keysByVersion: string[]): PackageKeyAndVersionPair[] {
        return keysByVersion.map(keyAndVersion => {
            const keyAndVersionSplit = keyAndVersion.split(":");
            return {
                packageKey: keyAndVersionSplit[0],
                version: keyAndVersionSplit[1]
            };
        });
    }

    private async exportToJson(data: any): Promise<void> {
        const filename = uuidv4() + ".json";
        const writtenFilename = await this.cuiFileService.writeToFileWithGivenName(JSON.stringify(data), filename);
        logger.info(FileService.fileDownloadedMessage + writtenFilename);
    }

    private parseParams(params?: string): URLSearchParams {
        const queryParams = new URLSearchParams();

        if (params) {
            try {
                params.split(",").forEach((param: string) => {
                    const paramKeyValuePair: string[] = param.split("=");
                    queryParams.set(paramKeyValuePair[0], paramKeyValuePair[1]);
                })
            } catch (e) {
                throw new FatalError(`Problem parsing query params: ${e}`);
            }
        }

        return queryParams;
    }
}
