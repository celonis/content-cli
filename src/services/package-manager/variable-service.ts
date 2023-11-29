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

        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(assignments), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
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

export const variableService = new VariableService();
