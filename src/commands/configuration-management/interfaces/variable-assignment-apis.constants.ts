export interface VariableAssignment {
    value: string;
    name: string;
}

export interface VariableAssignmentApi {
    url: string;
    defaultParams?: { [key: string]: string };
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
const GLOBAL_SCHEMA_SOURCE_TYPE = "global";
const OCDM_SCHEMA_SOURCE_TYPE = "ocdm";
const MAX_PARALLEL_DATA_SOURCE_REQUESTS = 4;
const MAX_POOL_IDS_PER_REQUEST = 100;
const STORIUM_POOL_PROVIDER_TYPE = "STORIUM";
const SCHEMA_POOL_PREFIX = /^([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})_/i;

const toPoolSchemas = (pool: any, dataSources: any[]): SchemaCandidate[] => {
    const sourceSchemas = new Map<string, SchemaCandidate & { managed: boolean }>();
    for (const dataSource of dataSources) {
        const type = String(dataSource?.type ?? "").toLowerCase();
        if (type === GLOBAL_SCHEMA_SOURCE_TYPE || type === OCDM_SCHEMA_SOURCE_TYPE) {
            continue;
        }
        const schema = dataSource?.targetSchemaName || `${pool.id}_${dataSource?.id}`;
        if (schema.toLowerCase() === pool.id.toLowerCase()) {
            continue;
        }
        const schemaPoolId = SCHEMA_POOL_PREFIX.exec(schema)?.[1];
        if (schemaPoolId && schemaPoolId.toLowerCase() !== pool.id.toLowerCase()) {
            continue;
        }
        const existing = sourceSchemas.get(schema);
        sourceSchemas.set(schema, {
            schema,
            name: existing?.name ?? (dataSource?.name || schema),
            poolName: pool.name,
            managed: !!existing?.managed || MANAGED_SCHEMA_SOURCE_TYPES.has(type),
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

const isStoriumBacked = (types: any): boolean =>
    [types?.primaryPoolProviderType, types?.secondaryPoolProviderType].includes(STORIUM_POOL_PROVIDER_TYPE);

const loadMissingPoolProviderTypes = async (get: (url: string) => Promise<any>, poolIds: string[]): Promise<any[]> => {
    const batches: string[][] = [];
    for (let index = 0; index < poolIds.length; index += MAX_POOL_IDS_PER_REQUEST) {
        batches.push(poolIds.slice(index, index + MAX_POOL_IDS_PER_REQUEST));
    }
    const typesPerBatch = await Promise.all(batches.map(batch => {
        const query = batch.map(poolId => `poolIds=${encodeURIComponent(poolId)}`).join("&");
        return get(`/integration/api/pools/pool-provider-types?${query}`);
    }));
    return typesPerBatch.flatMap(types => Array.isArray(types) ? types : []);
};

const loadSchemaCandidates = async (get: (url: string) => Promise<any>, poolsUrl: string): Promise<SchemaCandidate[]> => {
    const pools = await get(poolsUrl);
    const adminPools = (Array.isArray(pools) ? pools : [])
        .filter(pool => !!pool?.id && (pool.permissions ?? []).includes(DATA_POOL_ADMIN_PERMISSION));
    const loadedPools = await mapWithConcurrency(adminPools, MAX_PARALLEL_DATA_SOURCE_REQUESTS, async pool => {
        const dataSources = await get(`/integration/api/pools/${encodeURIComponent(pool.id)}/data-sources/slim-overview`);
        return {pool, dataSources: Array.isArray(dataSources) ? dataSources : []};
    });

    const typesByPool = new Map<string, any>();
    for (const {pool, dataSources} of loadedPools) {
        const typed = dataSources.find(dataSource => dataSource?.primaryPoolProviderType);
        if (typed) {
            typesByPool.set(pool.id, typed);
        }
    }
    const untypedPoolIds = loadedPools.map(({pool}) => pool.id).filter(poolId => !typesByPool.has(poolId));
    const loadedTypes = untypedPoolIds.length ? await loadMissingPoolProviderTypes(get, untypedPoolIds) : [];
    loadedTypes.forEach(types => typesByPool.set(types?.poolId, types));

    return loadedPools
        .filter(({pool}) => isStoriumBacked(typesByPool.get(pool.id)))
        .flatMap(({pool, dataSources}) => toPoolSchemas(pool, dataSources));
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
    OBJECTS_EVENTS_PACKAGE_KEY: {
        url: "/pacman/api/core/staging/packages/export/list",
        defaultParams: { flavors: "OCDM", includeBranches: "false" },
        toAssignment: candidate => ({
            value: candidate?.key,
            name: candidate?.name ?? candidate?.key,
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
