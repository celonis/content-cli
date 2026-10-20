import {URLSearchParams} from "url";
import { VariableAssignment, variableAssignmentApis } from "../interfaces/variable-assignment-apis.constants";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";

export class VariableAssignmentCandidatesApi {

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async getCandidateAssignments(type: string, params: URLSearchParams): Promise<VariableAssignment[]> {
        const assignmentApi = variableAssignmentApis[type];
        if (!assignmentApi) {
            throw new FatalError(`Variable type ${type} not supported.`);
        }

        const apiUrl: string = assignmentApi.url + (params.toString().length ? `?${params.toString()}` : "");

        const candidates = await this.httpClient().get(apiUrl).catch(e => {
            throw new FatalError(`Problem getting variables assignment values for type ${type}: ${e}`);
        });

        return (Array.isArray(candidates) ? candidates : [])
            .map(candidate => assignmentApi.toAssignment(candidate))
            .filter(assignment => !!assignment.value);
    }
}
