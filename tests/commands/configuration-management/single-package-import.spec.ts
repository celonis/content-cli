import * as path from "path";
import * as fs from "node:fs";
import AdmZip = require("adm-zip");
import { mockCreateReadStream, mockExistsSync, mockReadFileSync } from "../../utls/fs-mock-utils";

// The service imports `node:fs`; the global jest.mock("fs") in jest.setup only
// covers the bare "fs" specifier, so mock the prefixed module explicitly to
// intercept the temp-file cleanup (fs.rmSync).
jest.mock("node:fs");

jest.mock("adm-zip", () => {
    const realAdmZip = jest.requireActual("adm-zip");
    return jest.fn((...args: any[]) => realAdmZip(...args));
});

import { mockAxiosPost, mockedAxiosInstance, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { SinglePackageImportService } from "../../../src/commands/configuration-management/single-package-import.service";
import { SinglePackageImportResult } from "../../../src/commands/configuration-management/interfaces/single-package-import.interfaces";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { GitService } from "../../../src/core/git-profile/git/git.service";

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

    beforeEach(() => {
        mockExistsSync();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it.each([true, false])("Should import a single package from a zip file with overwrite %p", async (overwrite: boolean) => {
        const packageZip = buildSinglePackageZip();
        mockReadFileSync(packageZip.toBuffer());
        mockCreateReadStream(packageZip.toBuffer());

        const importResponse = buildImportResponse();
        mockAxiosPost(IMPORT_URL, importResponse);

        await new SinglePackageImportService(testContext).importPackage("./package.zip", null, overwrite, false, null);

        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
            IMPORT_URL,
            expect.anything(),
            expect.objectContaining({ params: { overwrite } })
        );
        expect(loggingTestTransport.logMessages[0].message).toContain("Successfully imported package: pkg-1");
        expect(loggingTestTransport.logMessages[3].message).toContain("Imported 1 node(s).");
    });

    it("Should import a single package from a directory by zipping it first", async () => {
        const packageZip = buildSinglePackageZip();
        const temporaryZipPath = "/tmp/content-cli-imports/single_package_test.zip";

        jest.spyOn(FileService.prototype, "isDirectory").mockReturnValue(true);
        const zipDirectorySpy = jest.spyOn(FileService.prototype, "zipDirectoryAsSinglePackage").mockReturnValue(temporaryZipPath);
        mockReadFileSync(packageZip.toBuffer());
        mockCreateReadStream(packageZip.toBuffer());

        const importResponse = buildImportResponse();
        mockAxiosPost(IMPORT_URL, importResponse);

        await new SinglePackageImportService(testContext).importPackage(null, "./package-dir", true, false, null);

        expect(zipDirectorySpy).toHaveBeenCalledWith("./package-dir");
        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(IMPORT_URL, expect.anything(), expect.anything());
        expect(fs.rmSync).toHaveBeenCalledWith(temporaryZipPath);
    });

    it("Should write the import result to a json file when jsonResponse is true", async () => {
        const packageZip = buildSinglePackageZip();
        mockReadFileSync(packageZip.toBuffer());
        mockCreateReadStream(packageZip.toBuffer());

        const importResponse = buildImportResponse();
        mockAxiosPost(IMPORT_URL, importResponse);

        await new SinglePackageImportService(testContext).importPackage("./package.zip", null, false, true, null);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            JSON.stringify(importResponse, null, 2),
            { encoding: "utf-8", mode: 0o600 }
        );
    });

    it("Should pass the overwrite flag to the API", async () => {
        const packageZip = buildSinglePackageZip();
        mockReadFileSync(packageZip.toBuffer());
        mockCreateReadStream(packageZip.toBuffer());

        mockAxiosPost(IMPORT_URL, buildImportResponse());

        await new SinglePackageImportService(testContext).importPackage("./package.zip", null, true, false, null);

        expect(mockedPostRequestBodyByUrl.has(IMPORT_URL)).toBe(true);
        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
            IMPORT_URL,
            expect.anything(),
            expect.objectContaining({ params: { overwrite: true } })
        );
    });

    it("Should import a single package from a Git branch when --gitBranch is set", async () => {
        const packageZip = buildSinglePackageZip();
        const pulledDirectory = "mocked-pulled-git-path";
        const temporaryZipPath = "/tmp/content-cli-imports/single_package_test.zip";

        const pullSpy = jest.spyOn(GitService.prototype, "pullFromBranch").mockResolvedValue(pulledDirectory);
        const zipDirectorySpy = jest.spyOn(FileService.prototype, "zipDirectoryAsSinglePackage").mockReturnValue(temporaryZipPath);
        mockReadFileSync(packageZip.toBuffer());
        mockCreateReadStream(packageZip.toBuffer());

        const importResponse = buildImportResponse();
        mockAxiosPost(IMPORT_URL, importResponse);

        await new SinglePackageImportService(testContext).importPackage(null, null, true, false, "my-branch");

        expect(pullSpy).toHaveBeenCalledWith("my-branch");
        expect(zipDirectorySpy).toHaveBeenCalledWith(pulledDirectory);
        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
            IMPORT_URL,
            expect.anything(),
            expect.objectContaining({ params: { overwrite: true } })
        );
        expect(loggingTestTransport.logMessages[0].message).toContain("Successfully imported package: pkg-1");
        expect(fs.rmSync).toHaveBeenCalledWith(temporaryZipPath);
        expect(fs.rmSync).toHaveBeenCalledWith(pulledDirectory, { recursive: true, force: true });
    });

    it("Should throw when both --file and --directory are provided", async () => {
        await expect(
            new SinglePackageImportService(testContext).importPackage("./package.zip", "./package-dir", false, false, null)
        ).rejects.toThrow("You cannot use both --file and --directory options at the same time. Only one import source can be defined.");
    });

    it.each(["./package.zip", "./package-dir"])("Should throw when --gitBranch is combined with another source (%s)", async (source: string) => {
        const file = source.endsWith(".zip") ? source : null;
        const directory = source.endsWith(".zip") ? null : source;

        await expect(
            new SinglePackageImportService(testContext).importPackage(file, directory, false, false, "my-branch")
        ).rejects.toThrow("You cannot use --file or --directory together with --gitBranch. Only one import source can be defined.");
    });

    it("Should throw when neither --file, --directory, nor --gitBranch is provided", async () => {
        await expect(
            new SinglePackageImportService(testContext).importPackage(null, null, false, false, null)
        ).rejects.toThrow("You must provide a --file, a --directory, or a --gitBranch option to import a package.");
    });

    it("Should throw when the --file option points to a directory", async () => {
        jest.spyOn(FileService.prototype, "isDirectory").mockReturnValue(true);

        await expect(
            new SinglePackageImportService(testContext).importPackage("./package-dir", null, false, false, null)
        ).rejects.toThrow("The --file option accepts only zip files.");
    });

    it("Should throw when the --directory option points to a file", async () => {
        jest.spyOn(FileService.prototype, "isDirectory").mockReturnValue(false);

        await expect(
            new SinglePackageImportService(testContext).importPackage(null, "./package.zip", false, false, null)
        ).rejects.toThrow("The --directory option accepts only directories.");
    });

    it("Should throw when the uncompressed zip size exceeds the 4 GB limit", async () => {
        const packageZip = buildSinglePackageZip();
        mockReadFileSync(packageZip.toBuffer());
        mockCreateReadStream(packageZip.toBuffer());

        const FIVE_GB = 5 * 1024 * 1024 * 1024;
        (AdmZip as unknown as jest.Mock).mockImplementationOnce((...args: any[]) => {
            const instance = jest.requireActual<any>("adm-zip")(...args);
            instance.getEntries = () => [{ header: { size: FIVE_GB } }];
            return instance;
        });

        await expect(
            new SinglePackageImportService(testContext).importPackage("./package.zip", null, false, false, null)
        ).rejects.toThrow('Failed to handle zip file "./package.zip": uncompressed size 5.00 GB exceeds the 4 GB limit.');
    });
});
