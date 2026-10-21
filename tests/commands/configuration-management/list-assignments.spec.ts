import { mockAxiosGet, mockedAxiosInstance } from "../../utls/http-requests-mock";
import { VariableCommandService } from "../../../src/commands/configuration-management/variable-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

describe("List assignments", () => {

    const DATA_MODEL_URL = "https://myTeam.celonis.cloud/package-manager/api/compute-pools/pools-with-data-models";
    const CONNECTIONS_URL = "https://myTeam.celonis.cloud/process-automation-v2/api/connections?param1=value1&param2=value2";
    const DATA_POOLS_URL = "https://myTeam.celonis.cloud/integration/api/pools";

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

    it("Should throw error for unsupported variable types", async () => {
        const type: string = "DUMMY_UNSUPPORTED_TYPE";

        await expect(new VariableCommandService(testContext).listAssignments(type, false, ""))
            .rejects.toThrow(`Variable type ${type} not supported.`);
    })
})
