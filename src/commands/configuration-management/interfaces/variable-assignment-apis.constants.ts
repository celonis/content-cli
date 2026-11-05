export interface VariableAssignment {
    value: string;
    name: string;
}

export interface VariableAssignmentApi {
    url: string;
    toAssignment: (candidate: any) => VariableAssignment;
    loadCandidates?: (get: (url: string) => Promise<any>, url: string) => Promise<any[]>;
}

interface SchemaCandidate {
    schema: string;
    name: string;
    poolName?: string;
}

const connectionName = (connection: any): string => {
    const parts = [connection?.authProvider?.label ?? connection?.authProvider?.name, connection?.username].filter(Boolean);
    return parts.length ? parts.join(" - ") : connection?.id;
};

const DATA_POOL_ADMIN_PERMISSION = "ADMIN";
const MANAGED_SCHEMA_SOURCE_TYPES = new Set(["pig", "context-model", "context-model-semantic"]);
const MAX_PARALLEL_DATA_SOURCE_REQUESTS = 4;
const SCHEMA_POOL_PREFIX = /^([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})_/i;

const toPoolSchemas = (pool: any, dataSources: any[]): SchemaCandidate[] => {
    const sourceSchemas = new Map<string, SchemaCandidate & { managed: boolean }>();
    for (const dataSource of dataSources) {
        const schema = dataSource?.targetSchemaName || `${pool.id}_${dataSource?.id}`;
        const schemaPoolId = SCHEMA_POOL_PREFIX.exec(schema)?.[1];
        if (schemaPoolId && schemaPoolId.toLowerCase() !== pool.id.toLowerCase()) {
            continue;
        }
        const existing = sourceSchemas.get(schema);
        sourceSchemas.set(schema, {
            schema,
            name: existing?.name ?? (dataSource?.name || schema),
            poolName: pool.name,
            managed: !!existing?.managed || MANAGED_SCHEMA_SOURCE_TYPES.has(dataSource?.type),
        });
    }
    const assignableSchemas = [...sourceSchemas.values()]
        .filter(candidate => !candidate.managed)
        .map(({schema, name, poolName}) => ({schema, name, poolName}));
    return [{schema: pool.id, name: "Global schema", poolName: pool.name}, ...assignableSchemas];
};

const mapWithConcurrency = async <T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let next = 0;
    const worker = async (): Promise<void> => {
        while (next < items.length) {
            const index = next++;
            results[index] = await mapper(items[index]);
        }
    };
    await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
    return results;
};

const loadSchemaCandidates = async (get: (url: string) => Promise<any>, poolsUrl: string): Promise<SchemaCandidate[]> => {
    const pools = await get(poolsUrl);
    const adminPools = (Array.isArray(pools) ? pools : [])
        .filter(pool => !!pool?.id && (pool.permissions ?? []).includes(DATA_POOL_ADMIN_PERMISSION));
    const schemasPerPool = await mapWithConcurrency(adminPools, MAX_PARALLEL_DATA_SOURCE_REQUESTS, async pool => {
        const dataSources = await get(`/integration/api/pools/${encodeURIComponent(pool.id)}/data-sources/slim-overview`);
        return toPoolSchemas(pool, Array.isArray(dataSources) ? dataSources : []);
    });
    return schemasPerPool.flat();
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
    SCHEMA_REFERENCE: {
        url: "/integration/api/pools",
        loadCandidates: loadSchemaCandidates,
        toAssignment: (candidate: SchemaCandidate) => ({
            value: candidate?.schema,
            name: [candidate?.poolName, candidate?.name].filter(Boolean).join(" / ") || candidate?.schema,
        }),
    },
};
