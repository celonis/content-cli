export interface VariableAssignment {
    value: string;
    name: string;
}

export interface VariableAssignmentApi {
    url: string;
    toAssignment: (candidate: any) => VariableAssignment;
}

const connectionName = (connection: any): string => {
    const parts = [connection?.authProvider?.label ?? connection?.authProvider?.name, connection?.username].filter(Boolean);
    return parts.length ? parts.join(" - ") : connection?.id;
};

export const variableAssignmentApis: { [key: string]: VariableAssignmentApi } = {
    DATA_MODEL: {
        url: "/package-manager/api/compute-pools/pools-with-data-models",
        toAssignment: candidate => ({
            value: candidate?.dataModel?.dataModelId,
            name: [candidate?.pool?.name, candidate?.dataModel?.name].filter(Boolean).join(" / ") || candidate?.dataModel?.dataModelId,
        }),
    },
    CONNECTION: {
        url: "/process-automation-v2/api/connections",
        toAssignment: candidate => ({
            value: candidate?.id,
            name: connectionName(candidate),
        }),
    },
    DATA_POOL_ID: {
        url: "/integration/api/pools",
        toAssignment: candidate => ({
            value: candidate?.id,
            name: candidate?.name ?? candidate?.id,
        }),
    },
};
