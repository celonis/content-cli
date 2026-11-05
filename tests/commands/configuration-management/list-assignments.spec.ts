import { mockAxiosGet, mockAxiosGetError, mockedAxiosInstance } from "../../utls/http-requests-mock";
import { VariableCommandService } from "../../../src/commands/configuration-management/variable-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

describe("List assignments", () => {

    const DATA_MODEL_URL = "https://myTeam.celonis.cloud/package-manager/api/compute-pools/pools-with-data-models";
    const CONNECTIONS_URL = "https://myTeam.celonis.cloud/process-automation-v2/api/connections?param1=value1&param2=value2";
    const DATA_POOLS_URL = "https://myTeam.celonis.cloud/integration/api/pools";
    const POOL_1 = "11111111-1111-1111-1111-111111111111";
    const POOL_2 = "22222222-2222-2222-2222-222222222222";
    const POOL_3 = "33333333-3333-3333-3333-333333333333";
    const dataSourcesUrl = (poolId: string) =>
        `https://myTeam.celonis.cloud/integration/api/pools/${poolId}/data-sources/slim-overview`;

    const dataModelCandidate = (poolName: string, dataModelId: string, dataModelName: string) => ({
        pool: {id: "pool-" + dataModelId, name: poolName},
        dataModel: {dataModelId, name: dataModelName, poolId: "pool-" + dataModelId},
        lastLoaded: null,
        businessGraphDataModel: false,
    });

    it("Should list data model assignments as value and name", async () => {
        mockAxiosGet(DATA_MODEL_URL, [
            dataModelCandidate("Pool 1", "dm-1", "Model 1"),
            dataModelCandidate("Pool 2", "dm-2", "Model 2"),
        ]);

        await new VariableCommandService(testContext).listAssignments("DATA_MODEL", false, "");

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain('{"value":"dm-1","name":"Pool 1 / Model 1"}');
        expect(loggingTestTransport.logMessages[1].message).toContain('{"value":"dm-2","name":"Pool 2 / Model 2"}');

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(DATA_MODEL_URL, expect.anything())
    })

    it("Should export assignments for supported type and json response", async () => {
        mockAxiosGet(DATA_MODEL_URL, [
            dataModelCandidate("Pool 1", "dm-1", "Model 1"),
            dataModelCandidate("Pool 2", "dm-2", "Model 2"),
        ]);

        await new VariableCommandService(testContext).listAssignments("DATA_MODEL", true, "");

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);

        expect(getJsonFromDownloadedFile()).toEqual([
            {value: "dm-1", name: "Pool 1 / Model 1"},
            {value: "dm-2", name: "Pool 2 / Model 2"},
        ]);
    })

    it("Should contain url params in the url", async () => {
        mockAxiosGet(CONNECTIONS_URL, [{id: "connection-1"}]);

        await new VariableCommandService(testContext).listAssignments("CONNECTION", false, "param1=value1,param2=value2");

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(CONNECTIONS_URL, expect.anything())
    })

    it("Should name connections by their provider and username", async () => {
        mockAxiosGet(CONNECTIONS_URL, [
            {id: "connection-1", username: "jane@celonis.com", authProvider: {name: "celonis", label: "Celonis"}},
            {id: "connection-2"},
        ]);

        await new VariableCommandService(testContext).listAssignments("CONNECTION", true, "param1=value1,param2=value2");

        expect(getJsonFromDownloadedFile()).toEqual([
            {value: "connection-1", name: "Celonis - jane@celonis.com"},
            {value: "connection-2", name: "connection-2"},
        ]);
    })

    it("Should list data pools as assignments for the DATA_POOL_ID type", async () => {
        mockAxiosGet(DATA_POOLS_URL, [
            {id: "pool-1", name: "Pool 1", dataPoolType: "DATA_JOBS"},
            {id: "pool-2", name: "Pool 2", dataPoolType: "DATA_JOBS"},
        ]);

        await new VariableCommandService(testContext).listAssignments("DATA_POOL_ID", true, "");

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(DATA_POOLS_URL, expect.anything());
        expect(getJsonFromDownloadedFile()).toEqual([
            {value: "pool-1", name: "Pool 1"},
            {value: "pool-2", name: "Pool 2"},
        ]);
    })

    it("Should skip candidates without a value", async () => {
        mockAxiosGet(DATA_POOLS_URL, [{name: "Pool without id"}, {id: "pool-1", name: "Pool 1"}]);

        await new VariableCommandService(testContext).listAssignments("DATA_POOL_ID", true, "");

        expect(getJsonFromDownloadedFile()).toEqual([{value: "pool-1", name: "Pool 1"}]);
    })

    it("Should list the global and data connection schemas of admin pools for the SCHEMA_REFERENCE type", async () => {
        mockAxiosGet(DATA_POOLS_URL, [
            {id: POOL_1, name: "Pool 1", permissions: ["ADMIN"]},
            {id: POOL_2, name: "Pool 2", permissions: ["VIEW_DATA_POOL"]},
            {id: POOL_3, name: "Pool 3", permissions: ["ADMIN", "VIEW_DATA_POOL"]},
        ]);
        mockAxiosGet(dataSourcesUrl(POOL_1), [
            {id: "sap", name: "SAP ECC", type: "sap", targetSchemaName: "sap_schema"},
            {id: "jdbc", name: "", type: "jdbc"},
            {id: "ccm", name: "My Context Model", type: "context-model", targetSchemaName: "ccm_schema"},
            {id: "imported", name: "Imported", type: "imported", targetSchemaName: `${POOL_2}_other`},
        ]);
        mockAxiosGet(dataSourcesUrl(POOL_3), []);

        await new VariableCommandService(testContext).listAssignments("SCHEMA_REFERENCE", true, "");

        expect(mockedAxiosInstance.get).not.toHaveBeenCalledWith(dataSourcesUrl(POOL_2), expect.anything());
        expect(getJsonFromDownloadedFile()).toEqual([
            {value: POOL_1, name: "Pool 1 / Global schema"},
            {value: "sap_schema", name: "Pool 1 / SAP ECC"},
            {value: `${POOL_1}_jdbc`, name: `Pool 1 / ${POOL_1}_jdbc`},
            {value: POOL_3, name: "Pool 3 / Global schema"},
        ]);
    })

    it("Should not offer a schema that a managed data source shares", async () => {
        mockAxiosGet(DATA_POOLS_URL, [{id: POOL_1, name: "Pool 1", permissions: ["ADMIN"]}]);
        mockAxiosGet(dataSourcesUrl(POOL_1), [
            {id: "sap", name: "SAP ECC", type: "sap", targetSchemaName: "shared_schema"},
            {id: "pig", name: "PIG", type: "pig", targetSchemaName: "shared_schema"},
        ]);

        await new VariableCommandService(testContext).listAssignments("SCHEMA_REFERENCE", true, "");

        expect(getJsonFromDownloadedFile()).toEqual([{value: POOL_1, name: "Pool 1 / Global schema"}]);
    })

    it("Should fail when the data sources of a pool cannot be loaded", async () => {
        mockAxiosGet(DATA_POOLS_URL, [{id: POOL_1, name: "Pool 1", permissions: ["ADMIN"]}]);
        mockAxiosGetError(dataSourcesUrl(POOL_1), 500, "Internal Server Error");

        await expect(new VariableCommandService(testContext).listAssignments("SCHEMA_REFERENCE", true, ""))
            .rejects.toThrow("Problem getting variables assignment values for type SCHEMA_REFERENCE");
    })

    it("Should throw error for unsupported variable types", async () => {
        const type: string = "DUMMY_UNSUPPORTED_TYPE";

        await expect(new VariableCommandService(testContext).listAssignments(type, false, ""))
            .rejects.toThrow(`Variable type ${type} not supported.`);
    })
})
