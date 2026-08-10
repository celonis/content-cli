import { mockAxiosGet, mockedAxiosInstance } from "../../utls/http-requests-mock";
import { VariableCommandService } from "../../../src/commands/configuration-management/variable-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

describe("List assignments", () => {

    const DATA_MODEL_URL = "https://myTeam.celonis.cloud/package-manager/api/compute-pools/pools-with-data-models";
    const CONNECTIONS_URL = "https://myTeam.celonis.cloud/process-automation-v2/api/connections?param1=value1&param2=value2";

    it("Should list assignments for supported type and non-json response", async () => {
        const mockAssignmentValues = [
            {id: "id-1"},
            {id: "id-2"}
        ];
        mockAxiosGet(DATA_MODEL_URL, mockAssignmentValues);

        await new VariableCommandService(testContext).listAssignments("DATA_MODEL", false, "");

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain('{"id":"id-1"}');
        expect(loggingTestTransport.logMessages[1].message).toContain('{"id":"id-2"}');

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(DATA_MODEL_URL, expect.anything())
    })

    it("Should export assignments for supported type and json response", async () => {
        const mockAssignmentValues = [
            {id: "id-1"},
            {id: "id-2"}
        ];
        mockAxiosGet(DATA_MODEL_URL, mockAssignmentValues);

        await new VariableCommandService(testContext).listAssignments("DATA_MODEL", true, "");

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);

        expect(getJsonFromDownloadedFile()).toEqual(mockAssignmentValues);
    })

    it("Should contain url params in the url", async () => {
        const mockAssignmentValues = [{id: "id-1"}];
        mockAxiosGet(CONNECTIONS_URL, mockAssignmentValues);

        await new VariableCommandService(testContext).listAssignments("CONNECTION", false, "param1=value1,param2=value2");

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(CONNECTIONS_URL, expect.anything())
    })

    it("Should throw error for unsupported variable types", async () => {
        const type: string = "DUMMY_UNSUPPORTED_TYPE";

        try {
            await new VariableCommandService(testContext).listAssignments(type, false, "");
        } catch (e) {
            if (!(e.message === `Variable type ${type} not supported.`)) {
                fail();
            }
        }
    })
})