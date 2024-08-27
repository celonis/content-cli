import { FileService } from "../../src/services/file-service";
import * as path from "path";
import { mockWriteFileSync, testTransport } from "../jest.setup";
import { mockedAxiosInstance } from "../utls/http-requests-mock";
import { ActionFlowCommand } from "../../src/commands/action-flow.command";
import * as AdmZip from "adm-zip";
import { mockCreateReadStream } from "../utls/fs-mock-utils";

describe("Import action-flows", () => {

    const packageId = "123-456-789";
    const mockImportResponse = {
        "status": "SUCCESS",
        "eventLog": [
            {
                "status": "SUCCESS",
                "assetType": "SCENARIO",
                "assetId": "asset-id-automation",
                "eventType": "IMPORT",
                "log": "updated action flow with key [asset-id-automation]",
                "mapping": null,
            },
        ],
    };

    it("Should call import API and return non-json response", async () => {
        const resp = { data: mockImportResponse };
        (mockedAxiosInstance.post as jest.Mock).mockResolvedValue(resp);
        const zip = new AdmZip();
        mockCreateReadStream(zip.toBuffer());

        await new ActionFlowCommand().importActionFlows(packageId, "tmp", true, false);

        expect(testTransport.logMessages.length).toBe(1);
        expect(testTransport.logMessages[0].message).toContain(JSON.stringify(mockImportResponse, null, 4));

        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(`https://myTeam.celonis.cloud/ems-automation/api/root/${packageId}/import/assets`, expect.anything(), expect.anything());
    });

    it("Should call import API and return json response", async () => {
        const resp = { data: mockImportResponse };
        (mockedAxiosInstance.post as jest.Mock).mockResolvedValue(resp);
        const zip = new AdmZip();
        mockCreateReadStream(zip.toBuffer());

        await new ActionFlowCommand().importActionFlows(packageId, "tmp", true, true);

        expect(testTransport.logMessages.length).toBe(1);
        expect(testTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);
        const expectedFileName = testTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(mockImportResponse, null, 4), { encoding: "utf-8" });
        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(`https://myTeam.celonis.cloud/ems-automation/api/root/${packageId}/import/assets`, expect.anything(), expect.anything());
    });
});