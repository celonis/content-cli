import {
    ColumnType,
    DataModelConfigurationTransport,
    DataModelForeignKeyTransport,
    DataModelTableTransport,
    DataModelTransport,
} from "../interfaces/data-model-transport.interfaces";
import { ConversionOptions, ConversionResult } from "../interfaces/conversion-result.interfaces";
import {
    AttributeDataType,
    Binding,
    ForeignKeyMapping,
    OntologyAttribute,
    OntologyNodeRequest,
    Reference,
    SemanticEventSourceContent,
    SemanticObjectContent,
    SemanticPerspectiveContent,
    SemanticRelationshipContent,
} from "../interfaces/ontology.interfaces";

interface TableContext {
    table: DataModelTableTransport;
    objectKey: string;
    columnToAttributeId: Map<string, string>;
    attributeById: Map<string, OntologyAttribute>;
}

/** Converts a Data Integration data model transport into pig semantic entity requests. */
export class DataModelConverterService {

    /** Converts tables, process configurations, and classic foreign keys into semantic entities. */
    public convert(transport: DataModelTransport, options: ConversionOptions): ConversionResult {
        const tableContexts = this.buildTableContexts(transport.tables ?? []);
        const objects = tableContexts.map((ctx) => this.convertTable(ctx, options));
        const eventSources = (transport.processConfigurations ?? [])
            .map((config) => this.convertProcessConfiguration(config, tableContexts, options))
            .filter((request): request is OntologyNodeRequest<SemanticEventSourceContent> => request !== null);
        const relationships = (transport.foreignKeys ?? [])
            .map((fk) => this.convertForeignKey(fk, tableContexts))
            .filter((request): request is OntologyNodeRequest<SemanticRelationshipContent> => request !== null);
        const perspective = this.convertPerspective(transport, objects, eventSources, relationships);

        return { objects, eventSources, relationships, perspective };
    }

    /** Derives the lake binding schema from pool id unless an explicit schema is provided. */
    public static deriveBindingSchema(poolId: string, explicitSchema?: string): string {
        if (explicitSchema) {
            return explicitSchema;
        }
        return `datapipelines_${poolId.replace(/-/g, "_")}_draft`;
    }

    private buildTableContexts(tables: DataModelTableTransport[]): TableContext[] {
        return tables.map((table) => {
            const objectKey = sanitizeKey(table.name);
            const columnToAttributeId = new Map<string, string>();
            const attributeById = new Map<string, OntologyAttribute>();
            const primaryKeys = table.primaryKeys ?? [];

            for (const column of table.columns ?? []) {
                const attributeId = this.resolveAttributeId(column.name, primaryKeys);
                columnToAttributeId.set(column.name, attributeId);
                const attribute: OntologyAttribute = {
                    id: attributeId,
                    dataType: mapColumnType(column.type),
                    required: attributeId === "ID" || column.primaryKey === true,
                };
                attributeById.set(attributeId, attribute);
            }

            this.ensureIdAttribute(table, columnToAttributeId, attributeById);

            return { table, objectKey, columnToAttributeId, attributeById };
        });
    }

    private convertTable(
        ctx: TableContext,
        options: ConversionOptions
    ): OntologyNodeRequest<SemanticObjectContent> {
        const attributes = Array.from(ctx.attributeById.values());
        const primaryKeys = attributes.some((attribute) => attribute.id === "ID") ? ["ID"] : [];

        return {
            key: ctx.objectKey,
            name: ctx.table.name,
            namespace: options.namespace,
            content: {
                attributes,
                primaryKeys,
                bindings: [this.buildTableBinding(ctx, options.bindingSchema)],
            },
        };
    }

    private convertProcessConfiguration(
        config: DataModelConfigurationTransport,
        tableContexts: TableContext[],
        options: ConversionOptions
    ): OntologyNodeRequest<SemanticEventSourceContent> | null {
        const activityTable = tableContexts.find((ctx) => ctx.table.id === config.activityTableId);
        if (!activityTable) {
            return null;
        }

        const columnNames = [
            config.caseIdColumn,
            config.activityColumn,
            config.timestampColumn,
            config.endTimestampColumn,
            config.sortingColumn,
            config.costColumn,
            config.userColumn,
        ].filter((value): value is string => !!value);

        const attributeById = new Map<string, OntologyAttribute>();
        const columnToAttributeId = new Map<string, string>();

        for (const columnName of columnNames) {
            const attributeId = columnName === config.caseIdColumn
                ? "ID"
                : sanitizeKey(columnName);
            columnToAttributeId.set(columnName, attributeId);
            const sourceColumn = activityTable.table.columns?.find((column) => column.name === columnName);
            attributeById.set(attributeId, {
                id: attributeId,
                dataType: sourceColumn ? mapColumnType(sourceColumn.type) : "STRING",
                required: attributeId === "ID" || columnName === config.timestampColumn,
            });
        }

        if (!attributeById.has("ID")) {
            attributeById.set("ID", { id: "ID", dataType: "STRING", required: true });
            columnToAttributeId.set(config.caseIdColumn, "ID");
        }

        const timestampAttribute = columnToAttributeId.get(config.timestampColumn);
        if (!timestampAttribute) {
            return null;
        }

        const eventSourceKey = sanitizeKey(`${activityTable.objectKey}-events`);
        const mappingColumns = columnNames.map((columnName) => ({
            sourceColumn: columnName,
            targetColumn: columnToAttributeId.get(columnName) ?? sanitizeKey(columnName),
        }));

        return {
            key: eventSourceKey,
            name: `${activityTable.table.name} Events`,
            namespace: options.namespace,
            content: {
                attributes: Array.from(attributeById.values()),
                primaryKeys: ["ID"],
                timestampAttribute,
                idAttribute: "ID",
                bindings: [{
                    name: `${eventSourceKey}-binding`,
                    namespace: options.namespace,
                    schema: options.bindingSchema,
                    table: activityTable.table.name,
                    mappingColumns,
                }],
            },
        };
    }

    private convertForeignKey(
        foreignKey: DataModelForeignKeyTransport,
        tableContexts: TableContext[]
    ): OntologyNodeRequest<SemanticRelationshipContent> | null {
        const source = tableContexts.find((ctx) => ctx.table.id === foreignKey.sourceTableId);
        const target = tableContexts.find((ctx) => ctx.table.id === foreignKey.targetTableId);
        if (!source || !target) {
            return null;
        }

        const foreignKeyMappings: ForeignKeyMapping[] = (foreignKey.columns ?? []).map((column) => ({
            sourceField: this.attributeForColumn(source, column.sourceColumnName),
            targetField: this.attributeForColumn(target, column.targetColumnName),
        }));

        const relationshipKey = sanitizeKey(`rel-${source.objectKey}-${target.objectKey}-${foreignKey.id}`);

        return {
            key: relationshipKey,
            name: `${source.table.name} -> ${target.table.name}`,
            content: {
                source: objectReference(source.objectKey),
                target: objectReference(target.objectKey),
                relationshipType: "INSTANCE_TO_INSTANCE",
                cardinality: "MANY_TO_ONE",
                foreignKeyMappings,
            },
        };
    }

    private convertPerspective(
        transport: DataModelTransport,
        objects: OntologyNodeRequest<SemanticObjectContent>[],
        eventSources: OntologyNodeRequest<SemanticEventSourceContent>[],
        relationships: OntologyNodeRequest<SemanticRelationshipContent>[]
    ): OntologyNodeRequest<SemanticPerspectiveContent> {
        const perspectiveKey = sanitizeKey(transport.name || transport.id);

        return {
            key: perspectiveKey,
            name: transport.name,
            content: {
                objects: objects.map((object) => objectReference(object.key)),
                events: eventSources.map((eventSource) => eventSourceReference(eventSource.key)),
                relationships: relationships.map((relationship) => relationshipReference(relationship.key)),
                perspectiveType: "CACHED",
                INSTANTIATE_ALL_EVENTS: false,
            },
        };
    }

    private buildTableBinding(ctx: TableContext, schema: string): Binding {
        const mappingColumns = (ctx.table.columns ?? []).map((column) => ({
            sourceColumn: column.name,
            targetColumn: ctx.columnToAttributeId.get(column.name) ?? sanitizeKey(column.name),
        }));

        return {
            name: `${ctx.objectKey}-binding`,
            schema,
            table: ctx.table.name,
            mappingColumns,
        };
    }

    private ensureIdAttribute(
        table: DataModelTableTransport,
        columnToAttributeId: Map<string, string>,
        attributeById: Map<string, OntologyAttribute>
    ): void {
        if (attributeById.has("ID")) {
            return;
        }

        const primaryKey = (table.primaryKeys ?? [])[0] ?? (table.columns ?? [])[0]?.name;
        if (!primaryKey) {
            attributeById.set("ID", { id: "ID", dataType: "STRING", required: true });
            return;
        }

        columnToAttributeId.set(primaryKey, "ID");
        const sourceColumn = (table.columns ?? []).find((column) => column.name === primaryKey);
        attributeById.set("ID", {
            id: "ID",
            dataType: sourceColumn ? mapColumnType(sourceColumn.type) : "STRING",
            required: true,
        });
    }

    private resolveAttributeId(columnName: string, primaryKeys: string[]): string {
        if (primaryKeys.length === 1 && primaryKeys[0] === columnName) {
            return "ID";
        }
        return sanitizeKey(columnName);
    }

    private attributeForColumn(ctx: TableContext, columnName: string): OntologyAttribute {
        const attributeId = ctx.columnToAttributeId.get(columnName) ?? sanitizeKey(columnName);
        return ctx.attributeById.get(attributeId) ?? {
            id: attributeId,
            dataType: "STRING",
        };
    }
}

function objectReference(referenceKey: string): Reference {
    return { type: "OBJECT", referenceKey };
}

function eventSourceReference(referenceKey: string): Reference {
    return { type: "EVENT_SOURCE", referenceKey };
}

function relationshipReference(referenceKey: string): Reference {
    return { type: "RELATIONSHIP", referenceKey };
}

function mapColumnType(columnType: ColumnType): AttributeDataType {
    switch (columnType) {
        case "INTEGER":
            return "INTEGER";
        case "FLOAT":
            return "DOUBLE";
        case "DATE":
            return "DATE";
        case "DATETIME":
            return "TIMESTAMP";
        case "TIME":
            return "STRING";
        case "BOOLEAN":
            return "BOOLEAN";
        case "STRING":
        default:
            return "STRING";
    }
}

function sanitizeKey(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .replace(/_+/g, "_");
}
