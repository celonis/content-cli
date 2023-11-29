import {
    ContentNodeTransport,
    VariablesAssignments
} from "../interfaces/package-manager.interfaces";
import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";
import {variableAssignmentApis} from "./variable-assignment-apis";
import {URLSearchParams} from "url";

class VariablesApi {
    public static readonly INSTANCE = new VariablesApi();
    public static readonly ASSIGNMENT_APIS  = variableAssignmentApis;


    public async assignVariableValues(packageKey: string, variablesAssignments: VariablesAssignments[]): Promise<ContentNodeTransport[]> {
        return httpClientV2.post(`/package-manager/api/nodes/by-package-key/${packageKey}/variables/values`, variablesAssignments).catch(e => {
            throw new FatalError(`Problem updating variables of package ${packageKey}: ${e}`);
        });
    }

    public async getCandidateAssignments(type: string, params?: URLSearchParams): Promise<Object[]> {
        const apiUrl: string = VariablesApi.ASSIGNMENT_APIS[type].url;

        if (apiUrl == null) {
            throw new FatalError(`Variable type ${type} not supported.`);
        }

        return httpClientV2.get(apiUrl + `?${params?.toString()}`).catch(e => {
            throw new FatalError(`Problem getting variables assignment values for type ${type}: ${e}`);
        });
    }
}

export const variablesApi = VariablesApi.INSTANCE;