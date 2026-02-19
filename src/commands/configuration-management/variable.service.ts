import {v4 as uuidv4} from "uuid";
import {Context} from "../../core/command/cli-context";
import {FatalError, logger} from "../../core/utils/logger";
import {StudioService} from "./studio.service";
import {FileService, fileService} from "../../core/utils/file-service";
import {PackageKeyAndVersionPair, VariableManifestTransport} from "./interfaces/package-export.interfaces";
import {BatchImportExportApi} from "./api/batch-import-export-api";
import {URLSearchParams} from "url";
import {VariableAssignmentCandidatesApi} from "./api/variable-assignment-candidates-api";

export class VariableService {
    private batchImportExportApi: BatchImportExportApi;
    private variableAssignmentCandidatesApi: VariableAssignmentCandidatesApi;
    private studioService: StudioService;

    constructor(context: Context) {
        this.batchImportExportApi = new BatchImportExportApi(context);
        this.variableAssignmentCandidatesApi = new VariableAssignmentCandidatesApi(context);
        this.studioService = new StudioService(context);
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

        this.exportToJson(assignments);
    }

    public async exportVariables(keysByVersion: string[], keysByVersionFile: string): Promise<void> {
        const variableManifests = await this.getVersionedVariablesByKeyVersionPairs(keysByVersion, keysByVersionFile);

        this.exportToJson(variableManifests);
    }

    private async getVersionedVariablesByKeyVersionPairs(
        keysByVersion: string[],
        keysByVersionFile: string
    ): Promise<VariableManifestTransport[]> {
        const variablesExportRequest: PackageKeyAndVersionPair[] = await this.buildKeyVersionPairs(
            keysByVersion,
            keysByVersionFile
        );

        const variableManifests =
            await this.batchImportExportApi.findVariablesWithValuesByPackageKeysAndVersion(variablesExportRequest);
        return this.studioService.fixConnectionVariables(variableManifests);
    }

    private async buildKeyVersionPairs(
        keysByVersion: string[],
        keysByVersionFile: string
    ): Promise<PackageKeyAndVersionPair[]> {
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
                version: keyAndVersionSplit[1],
            };
        });
    }

    private exportToJson(data: any): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(data), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }

    private parseParams(params?: string): URLSearchParams {
        const queryParams = new URLSearchParams();

        if (params) {
            try {
                params.split(",").forEach((param: string) => {
                    const paramKeyValuePair: string[] = param.split("=");
                    queryParams.set(paramKeyValuePair[0], paramKeyValuePair[1]);
                });
            } catch (e) {
                throw new FatalError(`Problem parsing query params: ${e}`);
            }
        }

        return queryParams;
    }
}
