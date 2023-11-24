import {packageApi} from "../../api/package-api";
import {
    PackageManagerVariableType,
    PackageWithVariableAssignments,
    VariablesAssignments
} from "../../interfaces/package-manager.interfaces";
import {variablesApi} from "../../api/variables-api";
import { v4 as uuidv4 } from "uuid";
import {logger} from "../../util/logger";
import {FileService, fileService} from "../file-service";

class VariableService {

    public async getVariableAssignmentsForNodes(type?: PackageManagerVariableType): Promise<PackageWithVariableAssignments[]> {
        return await packageApi.findAllPackagesWithVariableAssignments(type);
    }

    public async assignVariableValues(packageKey: string, variablesAssignments: VariablesAssignments[]): Promise<void> {
        await variablesApi.assignVariableValues(packageKey, variablesAssignments);
    }

    public async listCandidateAssignments(type: string, params: string): Promise<void> {
        const assignments = await variablesApi.getCandidateAssignments(type, params);

        assignments.forEach(assignment => {
            logger.info(JSON.stringify(assignment));
        });
    }

    public async findAndExportCandidateAssignments(type: string, params: string): Promise<void> {
        const assignments = await variablesApi.getCandidateAssignments(type, params);

        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(assignments), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }
}

export const variableService = new VariableService();
