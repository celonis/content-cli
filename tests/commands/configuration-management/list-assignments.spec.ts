import * as path from "path";
import { mockedAxiosInstance } from "../../utls/http-requests-mock";
import { VariableCommandService } from "../../../src/commands/configuration-management/variable-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";

describe("List assignments", () => {

    it("Should list assignments for supported type and non-json response", async () => {
        const mockAssignmentValues = [
            {id: "id-1"},
            {id: "id-2"}
        ];
        const resp = {data: mockAssignmentValues};
        (mockedAxiosInstance.get as jest.Mock).mockResolvedValue(resp);

        await new VariableCommandService(testContext).listAssignments("DATA_MODEL", false, "");

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain('{"id":"id-1"}');
        expect(loggingTestTransport.logMessages[1].message).toContain('{"id":"id-2"}');

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith("https://myTeam.celonis.cloud/package-manager/api/compute-pools/pools-with-data-models", expect.anything())
    })

    it("Should export assignments for supported type and json response", async () => {
        const mockAssignmentValues = [
            {id: "id-1"},
            {id: "id-2"}
        ];
        const resp = {data: mockAssignmentValues};
        (mockedAxiosInstance.get as jest.Mock).mockResolvedValue(resp);

        await new VariableCommandService(testContext).listAssignments("DATA_MODEL", true, "");

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(mockAssignmentValues), {encoding: "utf-8"});
    })

    it("Should contain url params in the url", async () => {
        const mockAssignmentValues = [{id: "id-1"}];
        const resp = {data: mockAssignmentValues};
        (mockedAxiosInstance.get as jest.Mock).mockResolvedValue(resp);

        await new VariableCommandService(testContext).listAssignments("CONNECTION", false, "param1=value1,param2=value2");

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith("https://myTeam.celonis.cloud/process-automation-v2/api/connections?param1=value1&param2=value2", expect.anything())
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