import { v4 as uuidv4 } from "uuid";
import {URLSearchParams} from "url";
import {
    PackageManagerVariableType,
    PackageWithVariableAssignments,
    VariablesAssignments,
} from "../interfaces/package-manager.interfaces";
import { Context } from "../../../core/command/cli-context";
import { PackageApi } from "../api/package-api";
import { FatalError, logger } from "../../../core/utils/logger";
import { FileService, fileService } from "../../../core/utils/file-service";
import { VariablesApi } from "../api/variables-api";
import { PackageKeyAndVersionPair, VariableManifestTransport } from "../interfaces/package-export.interfaces";
import { BatchImportExportApi } from "../api/batch-import-export-api";
import { StudioService } from "./studio.service";

export class VariableService {

    private packageApi: PackageApi;
    private variablesApi: VariablesApi;
    private batchImportExportApi: BatchImportExportApi;

    private studioService: StudioService;

    constructor(context: Context) {
        this.packageApi = new PackageApi(context);
        this.variablesApi = new VariablesApi(context);
        this.batchImportExportApi = new BatchImportExportApi(context);

        this.studioService = new StudioService(context);
    }

    public async getVariableAssignmentsForNodes(type?: PackageManagerVariableType): Promise<PackageWithVariableAssignments[]> {
        return await this.packageApi.findAllPackagesWithVariableAssignments(type);
    }

    public async assignVariableValues(packageKey: string, variablesAssignments: VariablesAssignments[]): Promise<void> {
        await this.variablesApi.assignVariableValues(packageKey, variablesAssignments);
    }

    public async listCandidateAssignments(type: string, params: string): Promise<void> {
        const parsedParams = this.parseParams(params);
        const assignments = await this.variablesApi.getCandidateAssignments(type, parsedParams);

        assignments.forEach(assignment => {
            logger.info(JSON.stringify(assignment));
        });
    }

    public async findAndExportCandidateAssignments(type: string, params: string): Promise<void> {
        const parsedParams = this.parseParams(params);
        const assignments = await this.variablesApi.getCandidateAssignments(type, parsedParams);

        this.exportToJson(assignments)
    }

    public async listVariables(keysByVersion: string[], keysByVersionFile: string): Promise<void> {
        const variableManifests = await this.getVersionedVariablesByKeyVersionPairs(keysByVersion, keysByVersionFile);

        variableManifests.forEach(variableManifest => {
            logger.info(JSON.stringify(variableManifest));
        });
    }

    public async exportVariables(keysByVersion: string[], keysByVersionFile: string): Promise<void> {
        const variableManifests = await this.getVersionedVariablesByKeyVersionPairs(keysByVersion, keysByVersionFile);

        this.exportToJson(variableManifests);
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

    private async getVersionedVariablesByKeyVersionPairs(keysByVersion: string[], keysByVersionFile: string): Promise<VariableManifestTransport[]> {
        const variablesExportRequest: PackageKeyAndVersionPair[] = await this.buildKeyVersionPairs(keysByVersion, keysByVersionFile);

        const variableManifests = await this.batchImportExportApi.findVariablesWithValuesByPackageKeysAndVersion(variablesExportRequest);
        return this.studioService.fixConnectionVariables(variableManifests);
    }

    private async buildKeyVersionPairs(keysByVersion: string[], keysByVersionFile: string): Promise<PackageKeyAndVersionPair[]> {
        let variablesExportRequest: PackageKeyAndVersionPair[] = [];

        if (keysByVersion.length !== 0) {
            variablesExportRequest = this.buildKeyAndVersionPairsFromArrayInput(keysByVersion);
        } else if (keysByVersion.length === 0 && keysByVersionFile !== "") {
            variablesExportRequest = await fileService.readFileToJson(keysByVersionFile);
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

    private exportToJson(data: any): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(data), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }
}
