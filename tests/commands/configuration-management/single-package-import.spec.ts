import AdmZip = require("adm-zip");

jest.mock("adm-zip", () => {
    const realAdmZip = jest.requireActual("adm-zip");
    return jest.fn((...args: any[]) => realAdmZip(...args));
});
import fs = require("node:fs");
import { mockAxiosPost, mockedAxiosInstance, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { SinglePackageImportService } from "../../../src/commands/configuration-management/single-package-import.service";
import { SinglePackageImportResult } from "../../../src/commands/configuration-management/interfaces/single-package-import.interfaces";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { getJsonFromDownloadedFile, makeTempDir } from "../../utls/fs-utils";

const IMPORT_URL = "https://myTeam.celonis.cloud/pacman/api/core/staging/packages/import-file";

function buildSinglePackageZip(): AdmZip {
    const zip = new AdmZip();
    zip.addFile("package.json", Buffer.from(JSON.stringify({
        key: "pkg-1",
        name: "My Package",
        type: "PACKAGE",
        flavor: "STUDIO",
        schemaVersion: 1,
        configuration: { variables: [] },
    })));
    zip.addFile("nodes/", Buffer.alloc(0));
    zip.addFile("nodes/node-1.json", Buffer.from(JSON.stringify({ key: "node-1", type: "VIEW" })));
    return zip;
}

function buildImportResponse(): SinglePackageImportResult {
    return {
        importedPackage: {
            id: "package-id-1",
            key: "pkg-1",
            name: "My Package",
            flavor: "STUDIO",
        },
        importedNodes: [
            {
                id: "node-id-1",
                key: "node-1",
                name: "My View",
                packageNodeKey: "pkg-1",
                packageNodeId: "package-node-id",
                type: "VIEW",
                invalidContent: false,
                creationDate: "2025-01-01T00:00:00.000Z",
                changeDate: "2025-01-01T00:00:00.000Z",
                createdBy: "user@celonis.com",
                updatedBy: "user@celonis.com",
                schemaVersion: 1,
            },
        ],
    };
}

describe("Single package import", () => {

    it.each([true, false])("Should import a single package from a zip file with overwrite %p", async (overwrite: boolean) => {
        const packageZip = buildSinglePackageZip();
        packageZip.writeZip("package.zip");

        const importResponse = buildImportResponse();
        mockAxiosPost(IMPORT_URL, importResponse);

        await new SinglePackageImportService(testContext).importPackage("./package.zip", null, overwrite, false);

        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
            IMPORT_URL,
            expect.anything(),
            expect.objectContaining({ params: { overwrite } })
        );
        expect(loggingTestTransport.logMessages[0].message).toContain("Successfully imported package: pkg-1");
        expect(loggingTestTransport.logMessages[3].message).toContain("Imported 1 node(s).");
    });

    it("Should import a single package from a directory by zipping it first", async () => {
        const packageFolder = makeTempDir();
        const zipDirectorySpy = jest.spyOn(FileService.prototype, "zipDirectoryAsSinglePackage");
        const rmSyncSpy = jest.spyOn(fs, "rmSync");

        const importResponse = buildImportResponse();
        mockAxiosPost(IMPORT_URL, importResponse);

        await new SinglePackageImportService(testContext).importPackage(null, packageFolder, true, false);

        expect(zipDirectorySpy).toHaveBeenCalledWith(packageFolder);
        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(IMPORT_URL, expect.anything(), expect.anything());
        expect(rmSyncSpy).toHaveBeenCalledWith(zipDirectorySpy.mock.results[0].value);
    });

    it("Should write the import result to a json file when jsonResponse is true", async () => {
        const packageZip = buildSinglePackageZip();
        packageZip.writeZip("package.zip");

        const importResponse = buildImportResponse();
        mockAxiosPost(IMPORT_URL, importResponse);

        await new SinglePackageImportService(testContext).importPackage("./package.zip", null, false, true);

        expect(getJsonFromDownloadedFile()).toEqual(importResponse);
    });

    it("Should pass the overwrite flag to the API", async () => {
        const packageZip = buildSinglePackageZip();
        packageZip.writeZip("package.zip");
        mockAxiosPost(IMPORT_URL, buildImportResponse());

        await new SinglePackageImportService(testContext).importPackage("./package.zip", null, true, false);

        expect(mockedPostRequestBodyByUrl.has(IMPORT_URL)).toBe(true);
        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
            IMPORT_URL,
            expect.anything(),
            expect.objectContaining({ params: { overwrite: true } })
        );
    });

    it("Should throw when both --file and --directory are provided", async () => {
        await expect(
            new SinglePackageImportService(testContext).importPackage("./package.zip", "./package-dir", false, false)
        ).rejects.toThrow("You cannot use both --file and --directory options at the same time. Only one import source can be defined.");
    });

    it("Should throw when neither --file nor --directory is provided", async () => {
        await expect(
            new SinglePackageImportService(testContext).importPackage(null, null, false, false)
        ).rejects.toThrow("You must provide either a --file or a --directory option to import a package.");
    });

    it("Should throw when the --file option points to a directory", async () => {
        jest.spyOn(FileService.prototype, "isDirectory").mockReturnValue(true);

        await expect(
            new SinglePackageImportService(testContext).importPackage("./package-dir", null, false, false)
        ).rejects.toThrow("The --file option accepts only zip files.");
    });

    it("Should throw when the --directory option points to a file", async () => {
        jest.spyOn(FileService.prototype, "isDirectory").mockReturnValue(false);

        await expect(
            new SinglePackageImportService(testContext).importPackage(null, "./package.zip", false, false)
        ).rejects.toThrow("The --directory option accepts only directories.");
    });

    it("Should throw when the uncompressed zip size exceeds the 4 GB limit", async () => {
        const FIVE_GB = 5 * 1024 * 1024 * 1024;
        (AdmZip as unknown as jest.Mock).mockImplementationOnce((...args: any[]) => {
            const instance = jest.requireActual<any>("adm-zip")(...args);
            instance.getEntries = () => [{ header: { size: FIVE_GB } }];
            return instance;
        });

        await expect(
            new SinglePackageImportService(testContext).importPackage("./package.zip", null, false, false)
        ).rejects.toThrow('Failed to handle zip file "./package.zip": uncompressed size 5.00 GB exceeds the 4 GB limit.');
    });

});
