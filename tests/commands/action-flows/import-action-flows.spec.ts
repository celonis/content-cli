import * as AdmZip from "adm-zip";
import { mockedAxiosInstance } from "../../utls/http-requests-mock";
import { ActionFlowCommandService } from "../../../src/commands/action-flows/action-flow/action-flow-command.service";
import { loggingTestTransport } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { testContext } from "../../utls/test-context";
import { getJsonFromDownloadedFile, zipToTempFolder } from "../../utls/fs-utils";

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
        const zipPath = zipToTempFolder(zip);

        await new ActionFlowCommandService(testContext).importActionFlows(packageId, zipPath, true, false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(JSON.stringify(mockImportResponse, null, 4));

        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(`https://myTeam.celonis.cloud/ems-automation/api/root/${packageId}/import/assets`, expect.anything(), expect.anything());
    });

    it("Should call import API and return json response", async () => {
        const resp = { data: mockImportResponse };
        (mockedAxiosInstance.post as jest.Mock).mockResolvedValue(resp);
        const zip = new AdmZip();
        const zipPath = zipToTempFolder(zip);

        await new ActionFlowCommandService(testContext).importActionFlows(packageId, zipPath, true, true);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);

        expect(getJsonFromDownloadedFile()).toEqual(mockImportResponse);
        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(`https://myTeam.celonis.cloud/ems-automation/api/root/${packageId}/import/assets`, expect.anything(), expect.anything());
    });
});