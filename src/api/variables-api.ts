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

    public async getCandidateAssignments(type: string, params?: string): Promise<Object[]> {
        const apiUrl: string = VariablesApi.ASSIGNMENT_APIS[type].url;

        if (apiUrl == null) {
            throw new FatalError(`Variable type ${type} not supported.`);
        }

        const queryParams = this.parseParams(params);

        return httpClientV2.get(apiUrl + `?${queryParams?.toString()}`).catch(e => {
            throw new FatalError(`Problem getting variables assignment values for type ${type}: ${e}`);
        });
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

export const variablesApi = VariablesApi.INSTANCE;