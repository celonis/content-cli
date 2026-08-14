import { mockAxiosGet, mockAxiosPost, mockedAxiosInstance } from "../../utls/http-requests-mock";
import { testContext } from "../../utls/test-context";
import { DataModelApi } from "../../../src/commands/data-model-migration/api/data-model-api";
import { DataModelMigrationService } from "../../../src/commands/data-model-migration/service/data-model-migration.service";
import { loggingTestTransport } from "../../jest.setup";

const POOL_ID = "pool-1";
const DATA_MODEL_ID = "dm-1";
const PACKAGE_KEY = "my-package";
const TRANSPORT_URL = `https://myTeam.celonis.cloud/integration/api/pools/${POOL_ID}/data-models/${DATA_MODEL_ID}/transport?includeColumns=true`;
const NODE_CREATE_URL = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/nodes`;

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

    it("Should POST staging nodes to Pacman when dry run is disabled", async () => {
        // Arrange
        mockAxiosPost(NODE_CREATE_URL, { key: "orders" });
        mockAxiosPost(NODE_CREATE_URL, { key: "demo_model" });

        // Act
        await new DataModelMigrationService(testContext).pushSemanticModel({
            poolId: POOL_ID,
            dataModelId: DATA_MODEL_ID,
            packageKey: PACKAGE_KEY,
            schema: "lake_schema",
        });

        // Assert
        const postCalls = (mockedAxiosInstance.post as jest.Mock).mock.calls;
        expect(postCalls).toHaveLength(2);
        expect(postCalls[0][0]).toBe(NODE_CREATE_URL);
        expect(JSON.parse(postCalls[0][1])).toEqual(expect.objectContaining({
            key: "orders",
            type: "SEMANTIC_OBJECT_TYPE",
            parentNodeKey: PACKAGE_KEY,
            schemaVersion: 1,
        }));
        expect(postCalls[1][0]).toBe(NODE_CREATE_URL);
        expect(JSON.parse(postCalls[1][1])).toEqual(expect.objectContaining({
            key: "demo_model",
            type: "SEMANTIC_PERSPECTIVE_TYPE",
            parentNodeKey: PACKAGE_KEY,
        }));
        expect(loggingTestTransport.logMessages[0].message).toContain("Successfully pushed semantic model");
    });
});
