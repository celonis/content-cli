import {packageApi} from "../../api/package-api";
import {
    PackageManagerVariableType,
    PackageWithVariableAssignments,
    VariablesAssignments
} from "../../interfaces/package-manager.interfaces";
import {variablesApi} from "../../api/variables-api";
import { v4 as uuidv4 } from "uuid";
import {FatalError, logger} from "../../util/logger";
import {FileService, fileService} from "../file-service";
import {URLSearchParams} from "url";
import {studioService} from "../studio/studio.service";
import {batchImportExportApi} from "../../api/batch-import-export-api";
import {PackageKeyAndVersionPair, VariableManifestTransport} from "../../interfaces/package-export-transport";

class VariableService {

    public async getVariableAssignmentsForNodes(type?: PackageManagerVariableType): Promise<PackageWithVariableAssignments[]> {
        return await packageApi.findAllPackagesWithVariableAssignments(type);
    }

    public async assignVariableValues(packageKey: string, variablesAssignments: VariablesAssignments[]): Promise<void> {
        await variablesApi.assignVariableValues(packageKey, variablesAssignments);
    }

    public async listCandidateAssignments(type: string, params: string): Promise<void> {
        const parsedParams = this.parseParams(params);
        const assignments = await variablesApi.getCandidateAssignments(type, parsedParams);

        assignments.forEach(assignment => {
            logger.info(JSON.stringify(assignment));
        });
    }

    public async findAndExportCandidateAssignments(type: string, params: string): Promise<void> {
        const parsedParams = this.parseParams(params);
        const assignments = await variablesApi.getCandidateAssignments(type, parsedParams);

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

        const variableManifests = await batchImportExportApi.findVariablesWithValuesByPackageKeysAndVersion(variablesExportRequest);
        return studioService.fixConnectionVariables(variableManifests);
    }

    private async buildKeyVersionPairs(keysByVersion: string[], keysByVersionFile: string): Promise<PackageKeyAndVersionPair[]> {
        let variablesExportRequest: PackageKeyAndVersionPair[] = [];

        if (keysByVersion.length) {
            variablesExportRequest = this.buildKeyAndVersionPairsFromArrayInput(keysByVersion);
        } else if (!keysByVersion.length && keysByVersionFile.length) {
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

export const variableService = new VariableService();
