import { mockAxiosGet, mockAxiosPost, mockedAxiosInstance } from "../../utls/http-requests-mock";
import { testContext } from "../../utls/test-context";
import { DataModelApi } from "../../../src/commands/data-model-migration/api/data-model-api";
import { DataModelMigrationService } from "../../../src/commands/data-model-migration/service/data-model-migration.service";
import { loggingTestTransport } from "../../jest.setup";

const POOL_ID = "pool-1";
const DATA_MODEL_ID = "dm-1";
const PACKAGE_KEY = "my-package";
const TRANSPORT_URL = `https://myTeam.celonis.cloud/integration/api/pools/${POOL_ID}/data-models/${DATA_MODEL_ID}/transport?includeColumns=true`;

const transportPayload = {
    id: DATA_MODEL_ID,
    name: "Demo Model",
    tables: [{
        id: "t1",
        name: "ORDERS",
        primaryKeys: ["ORDER_ID"],
        columns: [{ name: "ORDER_ID", type: "STRING", primaryKey: true }],
    }],
    foreignKeys: [],
    processConfigurations: [],
};

describe("Data model migration APIs", () => {
    it("Should call the integration transport endpoint with includeColumns=true", async () => {
        // Arrange
        mockAxiosGet(TRANSPORT_URL, transportPayload);

        // Act
        const result = await new DataModelApi(testContext).findOneTransport(POOL_ID, DATA_MODEL_ID, true);

        // Assert
        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(TRANSPORT_URL, expect.anything());
        expect(result.id).toBe(DATA_MODEL_ID);
    });
});

describe("DataModelMigrationService push", () => {
    const objectUrl = `https://myTeam.celonis.cloud/pig-sl-ontology/api/ontology/packages/${PACKAGE_KEY}/semantic-objects`;
    const perspectiveUrl = `https://myTeam.celonis.cloud/pig-sl-ontology/api/ontology/packages/${PACKAGE_KEY}/semantic-perspectives`;

    beforeEach(() => {
        mockAxiosGet(TRANSPORT_URL, transportPayload);
    });

    it("Should push converted entities in dependency order during a dry run without POST calls", async () => {
        // Act
        await new DataModelMigrationService(testContext).pushSemanticModel({
            poolId: POOL_ID,
            dataModelId: DATA_MODEL_ID,
            packageKey: PACKAGE_KEY,
            dryRun: true,
        });

        // Assert
        expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
        expect(loggingTestTransport.logMessages[0].message).toContain("Dry run semantic model conversion");
    });

    it("Should POST semantic entities to pig-sl-ontology when dry run is disabled", async () => {
        // Arrange
        mockAxiosPost(objectUrl, { key: "orders" });
        mockAxiosPost(
            `https://myTeam.celonis.cloud/pig-sl-ontology/api/ontology/packages/${PACKAGE_KEY}/semantic-event-sources`,
            { key: "unused" }
        );
        mockAxiosPost(
            `https://myTeam.celonis.cloud/pig-sl-ontology/api/ontology/packages/${PACKAGE_KEY}/semantic-relationships`,
            { key: "unused" }
        );
        mockAxiosPost(perspectiveUrl, { key: "demo_model" });

        // Act
        await new DataModelMigrationService(testContext).pushSemanticModel({
            poolId: POOL_ID,
            dataModelId: DATA_MODEL_ID,
            packageKey: PACKAGE_KEY,
            schema: "lake_schema",
        });

        // Assert
        const postCalls = (mockedAxiosInstance.post as jest.Mock).mock.calls;
        expect(postCalls[0][0]).toBe(objectUrl);
        expect(JSON.parse(postCalls[0][1])).toEqual(expect.objectContaining({ key: "orders" }));
        expect(postCalls[1][0]).toBe(perspectiveUrl);
        expect(JSON.parse(postCalls[1][1])).toEqual(expect.objectContaining({ key: "demo_model" }));
        expect(loggingTestTransport.logMessages[0].message).toContain("Successfully pushed semantic model");
    });
});
