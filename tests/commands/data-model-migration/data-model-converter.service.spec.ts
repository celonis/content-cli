import { DataModelTransport } from "../../../src/commands/data-model-migration/interfaces/data-model-transport.interfaces";
import { DataModelConverterService } from "../../../src/commands/data-model-migration/service/data-model-converter.service";

const POOL_ID = "pool-123";
const SCHEMA = "custom_schema";

const sampleTransport = (): DataModelTransport => ({
    id: "dm-1",
    name: "Order To Cash",
    poolId: POOL_ID,
    dataModelType: "CASE_CENTRIC",
    tables: [
        {
            id: "table-orders",
            name: "ORDERS",
            primaryKeys: ["ORDER_ID"],
            columns: [
                { name: "ORDER_ID", type: "STRING", primaryKey: true },
                { name: "CUSTOMER_ID", type: "STRING" },
                { name: "AMOUNT", type: "FLOAT" },
            ],
        },
        {
            id: "table-customers",
            name: "CUSTOMERS",
            primaryKeys: ["CUSTOMER_ID"],
            columns: [
                { name: "CUSTOMER_ID", type: "STRING", primaryKey: true },
                { name: "NAME", type: "STRING" },
            ],
        },
        {
            id: "table-events",
            name: "EVENTS",
            primaryKeys: ["CASE_ID"],
            columns: [
                { name: "CASE_ID", type: "STRING", primaryKey: true },
                { name: "ACTIVITY", type: "STRING" },
                { name: "EVENT_TIME", type: "DATETIME" },
            ],
        },
    ],
    foreignKeys: [
        {
            id: "fk-1",
            sourceTableId: "table-orders",
            targetTableId: "table-customers",
            columns: [{ sourceColumnName: "CUSTOMER_ID", targetColumnName: "CUSTOMER_ID" }],
        },
    ],
    processConfigurations: [
        {
            activityTableId: "table-events",
            caseIdColumn: "CASE_ID",
            activityColumn: "ACTIVITY",
            timestampColumn: "EVENT_TIME",
            defaultConfiguration: true,
        },
    ],
});

describe("DataModelConverterService", () => {
    const converter = new DataModelConverterService();

    it("Should map tables to semantic objects with ID attribute and bindings", () => {
        // Arrange
        const transport = sampleTransport();

        // Act
        const result = converter.convert(transport, { poolId: POOL_ID, bindingSchema: SCHEMA });

        // Assert
        const orders = result.objects.find((object) => object.key === "orders");
        expect(orders).toBeDefined();
        expect(orders?.content.attributes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: "ID", dataType: "STRING", required: true }),
                expect.objectContaining({ id: "customer_id", dataType: "STRING" }),
                expect.objectContaining({ id: "amount", dataType: "DOUBLE" }),
            ])
        );
        expect(orders?.content.bindings[0]).toEqual(expect.objectContaining({
            schema: SCHEMA,
            table: "ORDERS",
            mappingColumns: expect.arrayContaining([
                { sourceColumn: "ORDER_ID", targetColumn: "ID" },
            ]),
        }));
    });

    it("Should map process configurations to semantic event sources", () => {
        // Arrange
        const transport = sampleTransport();

        // Act
        const result = converter.convert(transport, { poolId: POOL_ID, bindingSchema: SCHEMA });

        // Assert
        expect(result.eventSources).toHaveLength(1);
        expect(result.eventSources[0].key).toBe("events_events");
        expect(result.eventSources[0].content.timestampAttribute).toBe("event_time");
        expect(result.eventSources[0].content.idAttribute).toBe("ID");
        expect(result.eventSources[0].content.bindings[0].table).toBe("EVENTS");
    });

    it("Should map classic foreign keys to semantic relationships without junction tables", () => {
        // Arrange
        const transport = sampleTransport();

        // Act
        const result = converter.convert(transport, { poolId: POOL_ID, bindingSchema: SCHEMA });

        // Assert
        expect(result.relationships).toHaveLength(1);
        expect(result.relationships[0].content.source).toEqual({ type: "OBJECT", referenceKey: "orders" });
        expect(result.relationships[0].content.target).toEqual({ type: "OBJECT", referenceKey: "customers" });
        expect(result.relationships[0].content.cardinality).toBe("MANY_TO_ONE");
        expect(result.relationships[0].content.foreignKeyMappings).toHaveLength(1);
        expect((result.relationships[0].content as any).junctionTable).toBeUndefined();
    });

    it("Should build a perspective referencing created objects, event sources, and relationships", () => {
        // Arrange
        const transport = sampleTransport();

        // Act
        const result = converter.convert(transport, { poolId: POOL_ID, bindingSchema: SCHEMA });

        // Assert
        expect(result.perspective.key).toBe("order_to_cash");
        expect(result.perspective.content.perspectiveType).toBe("CACHED");
        expect(result.perspective.content.objects).toHaveLength(3);
        expect(result.perspective.content.events).toHaveLength(1);
        expect(result.perspective.content.relationships).toHaveLength(1);
    });

    it("Should derive binding schema from pool id when no explicit schema is provided", () => {
        // Act
        const schema = DataModelConverterService.deriveBindingSchema("pool-123");

        // Assert
        expect(schema).toBe("datapipelines_pool_123_draft");
    });

    it("Should map TIME columns to STRING because ontology has no TIME type", () => {
        // Arrange
        const transport: DataModelTransport = {
            ...sampleTransport(),
            tables: [{
                id: "table-times",
                name: "TIMES",
                primaryKeys: ["ID"],
                columns: [{ name: "ID", type: "STRING", primaryKey: true }, { name: "START_TIME", type: "TIME" }],
            }],
            foreignKeys: [],
            processConfigurations: [],
        };

        // Act
        const result = converter.convert(transport, { poolId: POOL_ID, bindingSchema: SCHEMA });

        // Assert
        expect(result.objects[0].content.attributes).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: "start_time", dataType: "STRING" })])
        );
    });
});
