import {
    ContentNodeTransport,
    VariablesAssignments
} from "../interfaces/package-manager.interfaces";
import {URLSearchParams} from "url";
import { variableAssignmentApis } from "../interfaces/variable-assignment-apis.constants";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";

export class VariablesApi {
    private static readonly ASSIGNMENT_APIS  = variableAssignmentApis;
    private httpClient: HttpClient;

    constructor(context: Context) {
        this.httpClient = context.httpClient;
    }

    public async assignVariableValues(packageKey: string, variablesAssignments: VariablesAssignments[]): Promise<ContentNodeTransport[]> {
        return this.httpClient.post(`/package-manager/api/nodes/by-package-key/${packageKey}/variables/values`, variablesAssignments).catch(e => {
            throw new FatalError(`Problem updating variables of package ${packageKey}: ${e}`);
        });
    }

    public async getCandidateAssignments(type: string, params: URLSearchParams): Promise<object[]> {
        if (!VariablesApi.ASSIGNMENT_APIS[type]) {
            throw new FatalError(`Variable type ${type} not supported.`);
        }

        const apiUrl: string = VariablesApi.ASSIGNMENT_APIS[type].url + (params.toString().length ? `?${params.toString()}` : "");

        return this.httpClient.get(apiUrl).catch(e => {
            throw new FatalError(`Problem getting variables assignment values for type ${type}: ${e}`);
        });
    }

    public getRuntimeVariableValues(packageKey: string, appMode: string): Promise<VariablesAssignments[]> {
        const queryParams = new URLSearchParams();
        queryParams.set("appMode", appMode);

        return this.httpClient.get(`/package-manager/api/nodes/by-package-key/${packageKey}/variables/runtime-values?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting runtime variables of package ${packageKey}: ${e}`);
        });
    }
}
