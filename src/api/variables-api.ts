import {
    ContentNodeTransport,
    VariablesAssignments
} from "../interfaces/package-manager.interfaces";
import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";

class VariablesApi {
    public static readonly INSTANCE = new VariablesApi();

    public async assignVariableValues(packageKey: string, variablesAssignments: VariablesAssignments[]): Promise<ContentNodeTransport[]> {
        return httpClientV2.post(`/package-manager/api/nodes/by-package-key/${packageKey}/variables/values`, variablesAssignments).catch(e => {
            throw new FatalError(`Problem updating variables of package ${packageKey}: ${e}`);
        });
    }
}

export const variablesApi = VariablesApi.INSTANCE;