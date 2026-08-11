import { SaveNodeTransport, NodeConfiguration } from "../../configuration-management/interfaces/node.interfaces";
import { SEMANTIC_NODE_TYPES, SEMANTIC_SCHEMA_VERSION } from "../constants/semantic-node.constants";
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
    Reference,
    SemanticEventSourceConfiguration,
    SemanticObjectConfiguration,
    SemanticPerspectiveConfiguration,
    SemanticRelationshipConfiguration,
} from "../interfaces/semantic-entity.interfaces";

interface TableContext {
    table: DataModelTableTransport;
    objectKey: string;
    columnToAttributeId: Map<string, string>;
    attributeById: Map<string, OntologyAttribute>;
}

/** Converts a Data Integration data model transport into Pacman staging node payloads. */
export class DataModelConverterService {

    /** Converts tables, process configurations, and classic foreign keys into semantic entity nodes. */
    public convert(transport: DataModelTransport, options: ConversionOptions): ConversionResult {
        const tableContexts = this.buildTableContexts(transport.tables ?? []);
        const objects = tableContexts.map((ctx) => this.convertTable(ctx, options));
        const eventSources = (transport.processConfigurations ?? [])
            .map((config) => this.convertProcessConfiguration(config, tableContexts, options))
            .filter((node): node is SaveNodeTransport => node !== null);
        const relationships = (transport.foreignKeys ?? [])
            .map((fk) => this.convertForeignKey(fk, tableContexts, options))
            .filter((node): node is SaveNodeTransport => node !== null);
        const perspective = this.convertPerspective(transport, objects, eventSources, relationships, options);

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
                    required: attributeId === "ID" || Boolean(column.primaryKey),
                };
                attributeById.set(attributeId, attribute);
            }

            this.ensureIdAttribute(table, columnToAttributeId, attributeById);

            return { table, objectKey, columnToAttributeId, attributeById };
        });
    }

    private convertTable(ctx: TableContext, options: ConversionOptions): SaveNodeTransport {
        const attributes = Array.from(ctx.attributeById.values());
        const primaryKeys = attributes.some((attribute) => attribute.id === "ID") ? ["ID"] : [];
        const configuration: SemanticObjectConfiguration = {
            active: true,
            attributes,
            primaryKeys,
            calculatedAttributes: [],
            bindings: [this.buildTableBinding(ctx, options)],
        };

        return buildSemanticNode(
            options.packageKey,
            ctx.objectKey,
            ctx.table.name,
            SEMANTIC_NODE_TYPES.OBJECT,
            configuration
        );
    }

    private convertProcessConfiguration(
        config: DataModelConfigurationTransport,
        tableContexts: TableContext[],
        options: ConversionOptions
    ): SaveNodeTransport | null {
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

        const configuration: SemanticEventSourceConfiguration = {
            active: true,
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
        };

        return buildSemanticNode(
            options.packageKey,
            eventSourceKey,
            `${activityTable.table.name} Events`,
            SEMANTIC_NODE_TYPES.EVENT_SOURCE,
            configuration
        );
    }

    private convertForeignKey(
        foreignKey: DataModelForeignKeyTransport,
        tableContexts: TableContext[],
        options: ConversionOptions
    ): SaveNodeTransport | null {
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
        const configuration: SemanticRelationshipConfiguration = {
            source: objectReference(source.objectKey),
            target: objectReference(target.objectKey),
            relationshipType: "INSTANCE_TO_INSTANCE",
            cardinality: "MANY_TO_ONE",
            foreignKeyMappings,
        };

        return buildSemanticNode(
            options.packageKey,
            relationshipKey,
            `${source.table.name} -> ${target.table.name}`,
            SEMANTIC_NODE_TYPES.RELATIONSHIP,
            configuration
        );
    }

    private convertPerspective(
        transport: DataModelTransport,
        objects: SaveNodeTransport[],
        eventSources: SaveNodeTransport[],
        relationships: SaveNodeTransport[],
        options: ConversionOptions
    ): SaveNodeTransport {
        const perspectiveKey = sanitizeKey(transport.name || transport.id);
        const configuration: SemanticPerspectiveConfiguration = {
            active: true,
            objects: objects.map((object) => objectReference(object.key)),
            events: eventSources.map((eventSource) => eventSourceReference(eventSource.key)),
            relationships: relationships.map((relationship) => relationshipReference(relationship.key)),
            perspectiveType: "CACHED",
            INSTANTIATE_ALL_EVENTS: false,
        };

        return buildSemanticNode(
            options.packageKey,
            perspectiveKey,
            transport.name,
            SEMANTIC_NODE_TYPES.PERSPECTIVE,
            configuration
        );
    }

    private buildTableBinding(ctx: TableContext, options: ConversionOptions): Binding {
        const mappingColumns = (ctx.table.columns ?? []).map((column) => ({
            sourceColumn: column.name,
            targetColumn: ctx.columnToAttributeId.get(column.name) ?? sanitizeKey(column.name),
        }));

        return {
            name: `${ctx.objectKey}-binding`,
            namespace: options.namespace,
            schema: options.bindingSchema,
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

function buildSemanticNode(
    packageKey: string,
    key: string,
    name: string,
    type: string,
    configuration: NodeConfiguration
): SaveNodeTransport {
    return {
        key,
        name,
        type,
        parentNodeKey: packageKey,
        schemaVersion: SEMANTIC_SCHEMA_VERSION,
        configuration,
    };
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
    // Collapsing non-alphanumeric runs to a single "_" guarantees no consecutive
    // underscores, so trimming a single leading/trailing "_" needs no backtracking regex.
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
}
