import { mockAxiosGet, mockAxiosPost, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { BookmarksCommandService } from "../../../src/commands/bookmarks/bookmarks-command.service";
import { loggingTestTransport } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { testContext } from "../../utls/test-context";
import { getJsonFromDownloadedFile, writeJsonTempFile } from "../../utls/fs-utils";

describe("Export bookmarks", () => {

    const packageKey = "my-package";
    const mockExportResponse = {
        packageKey: "my-package",
        entries: [
            {
                assetKey: "analysis-1",
                assetType: "ANALYSIS",
                bookmark: {
                    name: "My Bookmark",
                    ownerId: "user-123",
                    sharedByLink: false,
                    published: true,
                },
                preference: {
                    configuration: "{\"filters\":[]}",
                    shareable: true,
                    mode: "PROCESS_ANALYTICS",
                    userId: "user-123",
                },
            },
        ],
    };

    it("Should call export API and write JSON to default file", async () => {
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/packages/${packageKey}/bookmarks/export`, mockExportResponse);

        await new BookmarksCommandService(testContext).exportBookmarks(packageKey);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);
        expect(loggingTestTransport.logMessages[0].message).toContain(`bookmarks-${packageKey}.json`);

        expect(getJsonFromDownloadedFile()).toEqual(mockExportResponse);
    });

    it("Should call export API and write JSON to specified file", async () => {
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/packages/${packageKey}/bookmarks/export`, mockExportResponse);

        await new BookmarksCommandService(testContext).exportBookmarks(packageKey, "custom-output.json");

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain("custom-output.json");

        expect(getJsonFromDownloadedFile()).toEqual(mockExportResponse);
    });
});

describe("Import bookmarks", () => {

    const packageKey = "my-package";
    const mockImportPayload = {
        entries: [
            {
                assetKey: "analysis-1",
                assetType: "ANALYSIS",
                bookmark: {
                    name: "My Bookmark",
                    ownerId: "user-123",
                    sharedByLink: false,
                    published: true,
                },
                preference: {
                    configuration: "{\"filters\":[]}",
                    shareable: true,
                    mode: "PROCESS_ANALYTICS",
                    userId: "user-123",
                },
            },
        ],
    };

    const mockImportResult = {
        packageKey: "my-package",
        entries: [
            {
                assetKey: "analysis-1",
                status: "CREATED",
                reason: null,
            },
        ],
    };

    it("Should read file and call import API", async () => {
        const importUrl = `https://myTeam.celonis.cloud/package-manager/api/packages/${packageKey}/bookmarks/import`;
        writeJsonTempFile("bookmarks-import.json", mockImportPayload);
        mockAxiosPost(importUrl, mockImportResult);

        await new BookmarksCommandService(testContext).importBookmarks(packageKey, "bookmarks-import.json");

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain("Bookmarks imported successfully");

        expect(JSON.parse(mockedPostRequestBodyByUrl.get(importUrl))).toEqual(mockImportPayload);
    });
});
