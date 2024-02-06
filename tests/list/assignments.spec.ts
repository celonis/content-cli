import {VariableCommand} from "../../src/commands/variable.command";
import axios from "axios";
import {FileService} from "../../src/services/file-service";
import * as path from "path";
import {mockWriteFileSync, testTransport} from "../jest.setup";

describe("List assignments", () => {

    it("Should list assignments for supported type and non-json response", async () => {
        const mockAssignmentValues = [
            {id: "id-1"},
            {id: "id-2"}
        ];
        const resp = {data: mockAssignmentValues};
        (axios.get as jest.Mock).mockResolvedValue(resp);

        await new VariableCommand().listAssignments("DATA_MODEL", false, "");

        expect(testTransport.logMessages.length).toBe(2);
        expect(testTransport.logMessages[0].message).toContain('{"id":"id-1"}');
        expect(testTransport.logMessages[1].message).toContain('{"id":"id-2"}');

        expect(axios.get).toHaveBeenCalledWith("https://myTeam.celonis.cloud/package-manager/api/compute-pools/pools-with-data-models", expect.anything())
    })

    it("Should export assignments for supported type and json response", async () => {
        const mockAssignmentValues = [
            {id: "id-1"},
            {id: "id-2"}
        ];
        const resp = {data: mockAssignmentValues};
        (axios.get as jest.Mock).mockResolvedValue(resp);

        await new VariableCommand().listAssignments("DATA_MODEL", true, "");

        expect(testTransport.logMessages.length).toBe(1);
        expect(testTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);

        const expectedFileName = testTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(mockAssignmentValues), {encoding: "utf-8"});
    })

    it("Should contain url params in the url", async () => {
        const mockAssignmentValues = [{id: "id-1"}];
        const resp = {data: mockAssignmentValues};
        (axios.get as jest.Mock).mockResolvedValue(resp);

        await new VariableCommand().listAssignments("CONNECTION", false, "param1=value1,param2=value2");

        expect(axios.get).toHaveBeenCalledWith("https://myTeam.celonis.cloud/process-automation-v2/api/connections?param1=value1&param2=value2", expect.anything())
    })

    it("Should throw error for unsupported variable types", async () => {
        const type: string = "DUMMY_UNSUPPORTED_TYPE";

        try {
            await new VariableCommand().listAssignments(type, false, "");
        } catch (e) {
            if (!(e.message === `Variable type ${type} not supported.`)) {
                fail();
            }
        }
    })
})