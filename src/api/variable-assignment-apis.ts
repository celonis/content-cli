import {VariableAssignmentApi} from "../interfaces/variable-assignment-api.interface";

export const variableAssignmentApis: { [key: string]: VariableAssignmentApi } = {
    DATA_MODEL: {
        url: "/package-manager/api/compute-pools/pools-with-data-models"
    },
    CONNECTION: {
        url: "/process-automation-v2/api/connections"
    }
};