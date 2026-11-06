import { VariableAssignment } from "../interfaces/variable-assignment-apis.constants";

interface SchemaCandidate {
    schema: string;
    name: string;
    poolName?: string;
}

const DATA_POOL_ADMIN_PERMISSION = "ADMIN";
const MANAGED_SCHEMA_SOURCE_TYPES = new Set(["pig", "context-model", "context-model-semantic"]);
const MAX_PARALLEL_DATA_SOURCE_REQUESTS = 4;
const STORIUM_POOL_PROVIDER_TYPE = "STORIUM";

const toPoolSchemas = (pool: any, dataSources: any[]): SchemaCandidate[] => {
    const sourceSchemas = new Map<string, SchemaCandidate & { managed: boolean }>();
    for (const dataSource of dataSources) {
        const schema = dataSource?.targetSchemaName || `${pool.id}_${dataSource?.id}`;
        if (schema !== pool.id && !schema.startsWith(`${pool.id}_`)) {
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
        if (next >= items.length) {
            return;
        }
        const index = next++;
        results[index] = await mapper(items[index]);
        return worker();
    };
    await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
    return results;
};

const isOfferedEngine = (dataSources: any[]): boolean => {
    const typed = dataSources.find(dataSource => dataSource?.primaryPoolProviderType || dataSource?.secondaryPoolProviderType);
    return !typed || [typed.primaryPoolProviderType, typed.secondaryPoolProviderType].includes(STORIUM_POOL_PROVIDER_TYPE);
};

export const loadSchemaCandidates = async (get: (url: string) => Promise<any>, poolsUrl: string): Promise<SchemaCandidate[]> => {
    const pools = await get(poolsUrl);
    const adminPools = (Array.isArray(pools) ? pools : [])
        .filter(pool => !!pool?.id && (pool.permissions ?? []).includes(DATA_POOL_ADMIN_PERMISSION));
    const loadedPools = await mapWithConcurrency(adminPools, MAX_PARALLEL_DATA_SOURCE_REQUESTS, async pool => {
        const dataSources = await get(`/integration/api/pools/${encodeURIComponent(pool.id)}/data-sources/slim-overview`);
        return {pool, dataSources: Array.isArray(dataSources) ? dataSources : []};
    });

    return loadedPools
        .filter(({dataSources}) => isOfferedEngine(dataSources))
        .flatMap(({pool, dataSources}) => toPoolSchemas(pool, dataSources))
        .sort((a, b) => (a.poolName ?? "").localeCompare(b.poolName ?? "") || a.name.localeCompare(b.name));
};

export const toSchemaAssignment = (candidate: SchemaCandidate): VariableAssignment => ({
    value: candidate?.schema,
    name: [candidate?.poolName, candidate?.name].filter(Boolean).join(" / ") || candidate?.schema,
});
