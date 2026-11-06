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

        const query = new URLSearchParams(assignmentApi.defaultParams ?? {});
        params.forEach((_value, key) => query.delete(key));
        params.forEach((value, key) => query.append(key, value));
        const apiUrl: string = assignmentApi.url + (query.toString().length ? `?${query.toString()}` : "");

        const get = (url: string): Promise<any> => this.httpClient().get(url);
        const request = assignmentApi.loadCandidates ? assignmentApi.loadCandidates(get, apiUrl) : get(apiUrl);
        const candidates = await request.catch(e => {
            throw new FatalError(`Problem getting variables assignment values for type ${type}: ${e}`);
        });

        return (Array.isArray(candidates) ? candidates : [])
            .map(candidate => assignmentApi.toAssignment(candidate))
            .filter(assignment => !!assignment.value);
    }
}
