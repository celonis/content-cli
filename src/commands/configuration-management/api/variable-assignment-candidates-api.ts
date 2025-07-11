import {URLSearchParams} from "url";
import { variableAssignmentApis } from "../interfaces/variable-assignment-apis.constants";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";

export class VariableAssignmentCandidatesApi {

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async getCandidateAssignments(type: string, params: URLSearchParams): Promise<object[]> {
        if (!variableAssignmentApis[type]) {
            throw new FatalError(`Variable type ${type} not supported.`);
        }

        const apiUrl: string = variableAssignmentApis[type].url + (params.toString().length ? `?${params.toString()}` : "");

        return this.httpClient().get(apiUrl).catch(e => {
            throw new FatalError(`Problem getting variables assignment values for type ${type}: ${e}`);
        });
    }
}
