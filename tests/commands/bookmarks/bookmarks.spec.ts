import { mockAxiosGet, mockAxiosGetError, mockAxiosPost, mockAxiosPostError, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { BookmarksCommandService } from "../../../src/commands/bookmarks/bookmarks-command.service";
import { loggingTestTransport } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { FatalError } from "../../../src/core/utils/logger";
import { testContext } from "../../utls/test-context";
import { getJsonFromDownloadedFile, writeJsonTempFile } from "../../utls/fs-utils";
import { Configurator } from "../../../src/core/command/module-handler";
import { Command } from "commander";

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

        expect(loggingTestTransport.logMessages).toHaveLength(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);
        expect(loggingTestTransport.logMessages[0].message).toContain(`bookmarks-${packageKey}.json`);

        expect(getJsonFromDownloadedFile()).toEqual(mockExportResponse);
    });

    it("Should call export API and write JSON to specified file", async () => {
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/packages/${packageKey}/bookmarks/export`, mockExportResponse);

        await new BookmarksCommandService(testContext).exportBookmarks(packageKey, "custom-output.json");

        expect(loggingTestTransport.logMessages).toHaveLength(1);
        expect(loggingTestTransport.logMessages[0].message).toContain("custom-output.json");

        expect(getJsonFromDownloadedFile()).toEqual(mockExportResponse);
    });

    it("Should throw FatalError when export API fails", async () => {
        mockAxiosGetError(`https://myTeam.celonis.cloud/package-manager/api/packages/${packageKey}/bookmarks/export`, 500, { message: "Internal Server Error" });

        await expect(new BookmarksCommandService(testContext).exportBookmarks(packageKey))
            .rejects.toThrow(FatalError);
        await expect(new BookmarksCommandService(testContext).exportBookmarks(packageKey))
            .rejects.toThrow(/Problem exporting bookmarks for package my-package/);
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

        expect(loggingTestTransport.logMessages).toHaveLength(1);
        expect(loggingTestTransport.logMessages[0].message).toContain("Bookmarks imported successfully");

        expect(JSON.parse(mockedPostRequestBodyByUrl.get(importUrl))).toEqual(mockImportPayload);
    });

    it("Should throw FatalError when import API fails", async () => {
        const importUrl = `https://myTeam.celonis.cloud/package-manager/api/packages/${packageKey}/bookmarks/import`;
        writeJsonTempFile("bookmarks-import-err.json", mockImportPayload);
        mockAxiosPostError(importUrl, 500, { message: "Internal Server Error" });

        await expect(new BookmarksCommandService(testContext).importBookmarks(packageKey, "bookmarks-import-err.json"))
            .rejects.toThrow(FatalError);
        await expect(new BookmarksCommandService(testContext).importBookmarks(packageKey, "bookmarks-import-err.json"))
            .rejects.toThrow(/Problem importing bookmarks for package my-package/);
    });
});

describe("Bookmarks module registration", () => {

    it("Should register export and import bookmarks commands", () => {
        const Module = require("../../../src/commands/bookmarks/module");
        const program = new Command();
        const configurator = new Configurator(program, testContext);

        const moduleInstance = new Module();
        moduleInstance.register(testContext, configurator);

        const exportCmd = program.commands.find(c => c.name() === "export");
        expect(exportCmd).toBeDefined();
        const exportBookmarksCmd = exportCmd.commands.find(c => c.name() === "bookmarks");
        expect(exportBookmarksCmd).toBeDefined();
        expect(exportBookmarksCmd.description()).toBe("Export bookmarks for a package");

        const importCmd = program.commands.find(c => c.name() === "import");
        expect(importCmd).toBeDefined();
        const importBookmarksCmd = importCmd.commands.find(c => c.name() === "bookmarks");
        expect(importBookmarksCmd).toBeDefined();
        expect(importBookmarksCmd.description()).toBe("Import bookmarks into a package");
    });

    it("Should execute export bookmarks action", async () => {
        const exportUrl = `https://myTeam.celonis.cloud/package-manager/api/packages/test-pkg/bookmarks/export`;
        mockAxiosGet(exportUrl, { packageKey: "test-pkg", entries: [] });

        const Module = require("../../../src/commands/bookmarks/module");
        const program = new Command();
        const configurator = new Configurator(program, testContext);

        const moduleInstance = new Module();
        moduleInstance.register(testContext, configurator);

        await program.parseAsync(["export", "bookmarks", "--packageKey", "test-pkg"], { from: "user" });

        expect(loggingTestTransport.logMessages).toHaveLength(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);
    });

    it("Should execute import bookmarks action", async () => {
        const importUrl = `https://myTeam.celonis.cloud/package-manager/api/packages/test-pkg/bookmarks/import`;
        const payload = { entries: [] };
        writeJsonTempFile("module-test-import.json", payload);
        mockAxiosPost(importUrl, { packageKey: "test-pkg", entries: [] });

        const Module = require("../../../src/commands/bookmarks/module");
        const program = new Command();
        const configurator = new Configurator(program, testContext);

        const moduleInstance = new Module();
        moduleInstance.register(testContext, configurator);

        await program.parseAsync(["import", "bookmarks", "--packageKey", "test-pkg", "-f", "module-test-import.json"], { from: "user" });

        expect(loggingTestTransport.logMessages).toHaveLength(1);
        expect(loggingTestTransport.logMessages[0].message).toContain("Bookmarks imported successfully");
    });
});
