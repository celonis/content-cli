import * as path from "path";
import * as fs from "node:fs";
import AdmZip = require("adm-zip");
import { mockAxiosGet, mockAxiosGetError, mockAxiosPost, mockedAxiosInstance, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { SinglePackageExportService } from "../../../src/commands/configuration-management/single-package-export.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { GitService } from "../../../src/core/git-profile/git/git.service";
import { accessSync, readFileSync } from "node:fs";

const PACKAGE_KEY = "pkg-1";
const EXPORT_URL = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/export-file`;
const STAGING_VARIABLES_URL = "https://myTeam.celonis.cloud/pacman/api/core/staging/packages/variables/by-package-keys";
const PACKAGE_ENTRIES = ["package.json", "variables.json", "nodes"];

function buildSinglePackageZip(): Buffer {
    const zip = new AdmZip();
    zip.addFile("package.json", Buffer.from(JSON.stringify({
        key: PACKAGE_KEY,
        name: "My Package",
        type: "PACKAGE",
        flavor: "STUDIO",
        schemaVersion: 1,
        configuration: { variables: [] },
    })));
    zip.addFile("variables.json", Buffer.from(JSON.stringify([])));
    zip.addFile("nodes/", Buffer.alloc(0));
    zip.addFile("nodes/node-1.json", Buffer.from(JSON.stringify({ key: "node-1", type: "VIEW" })));
    return zip.toBuffer();
}

function buildPackageZipWithTargetValues(): Buffer {
    const zip = new AdmZip();
    zip.addFile("package.json", Buffer.from(JSON.stringify({
        key: PACKAGE_KEY,
        name: "My Package",
        type: "PACKAGE",
        flavor: "STUDIO",
        schemaVersion: 1,
        configuration: { variables: [] },
        additionalFields: { spaceId: "package-space" },
    })));
    zip.addFile("variables.json", Buffer.from(JSON.stringify([{ key: "dm", type: "DATA_MODEL", value: "dm-1" }])));
    zip.addFile("nodes/", Buffer.alloc(0));
    zip.addFile("nodes/node-1.json", Buffer.from(JSON.stringify({
        key: "node-1",
        type: "VIEW",
        additionalFields: { spaceId: "node-space", order: 0 },
    })));
    zip.addFile("nodes/node-2.json", Buffer.from(JSON.stringify({ key: "node-2", type: "VIEW" })));
    return zip.toBuffer();
}

function readJsonEntry(zip: AdmZip, entryName: string): any {
    return JSON.parse(zip.getEntry(entryName).getData().toString("utf-8"));
}

describe("Single package export", () => {

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("Should export the package unzipped into a <packageKey> directory by default", async () => {
        const packageData = buildSinglePackageZip();
        mockAxiosGet(EXPORT_URL, packageData);

        const extractSpy = jest.spyOn(FileService.prototype, "extractZipBufferToDirectory").mockImplementation(() => undefined);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, false, null);

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(EXPORT_URL, expect.anything());
        expect(extractSpy).toHaveBeenCalledTimes(1);
        const [extractedData, extractedDir] = extractSpy.mock.calls[0];
        expect((extractedData as Buffer).equals(packageData)).toBe(true);
        expect(extractedDir).toEqual(PACKAGE_KEY);
        expect(loggingTestTransport.logMessages[0].message).toContain(`Successful export. Exported directory: ${PACKAGE_KEY}`);
    });

    it("Should export the package as <packageKey>.zip when --zip is set", async () => {
        const packageData = buildSinglePackageZip();
        mockAxiosGet(EXPORT_URL, packageData);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, true, null);

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(EXPORT_URL, expect.anything());

        const expectedFile = path.resolve(process.cwd(), `${PACKAGE_KEY}.zip`);
        expect(() => accessSync(expectedFile)).not.toThrow();
        expect(readFileSync(expectedFile)).toEqual(packageData);
        expect(loggingTestTransport.logMessages[0].message).toContain(`${FileService.fileDownloadedMessage}${PACKAGE_KEY}.zip`);
    });

    it("Should surface a fatal error when the export endpoint returns an error", async () => {
        mockAxiosGetError(EXPORT_URL, 404, { errorCode: "PACKAGE_NOT_FOUND" });

        await expect(
            new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, false, null)
        ).rejects.toThrow(`Problem exporting package ${PACKAGE_KEY}`);
    });

    it("Should push the exported package to a Git branch when --gitBranch is set", async () => {
        const packageData = buildSinglePackageZip();
        mockAxiosGet(EXPORT_URL, packageData);

        const extractedDirectory = "/tmp/content-cli-export-temp";
        const extractTempSpy = jest.spyOn(FileService.prototype, "extractZipBufferToTempDirectory").mockReturnValue(extractedDirectory);
        const extractDirSpy = jest.spyOn(FileService.prototype, "extractZipBufferToDirectory").mockImplementation(() => undefined);
        const pushToBranchSpy = jest.spyOn(GitService.prototype, "pushToBranch").mockResolvedValue();
        const rmSyncSpy = jest.spyOn(fs, "rmSync").mockImplementation(() => undefined);
        const writeBufferSpy = jest.spyOn(FileService.prototype, "writeBufferToFileWithGivenName").mockImplementation(() => undefined);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, false, "my-branch");

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(EXPORT_URL, expect.anything());
        expect(extractTempSpy).toHaveBeenCalledTimes(1);
        expect((extractTempSpy.mock.calls[0][0] as Buffer).equals(packageData)).toBe(true);
        expect(pushToBranchSpy).toHaveBeenCalledWith(extractedDirectory, "my-branch", PACKAGE_ENTRIES);
        expect(rmSyncSpy).toHaveBeenCalledWith(extractedDirectory, { recursive: true, force: true });
        expect(loggingTestTransport.logMessages[0].message).toContain("Successfully exported package to branch: my-branch");
        expect(extractDirSpy).not.toHaveBeenCalled();
        expect(writeBufferSpy).not.toHaveBeenCalled();
    });

    it("Should push to the Git branch unzipped even when --zip is also set", async () => {
        const packageData = buildSinglePackageZip();
        mockAxiosGet(EXPORT_URL, packageData);

        const extractedDirectory = "/tmp/content-cli-export-temp";
        const extractTempSpy = jest.spyOn(FileService.prototype, "extractZipBufferToTempDirectory").mockReturnValue(extractedDirectory);
        const pushToBranchSpy = jest.spyOn(GitService.prototype, "pushToBranch").mockResolvedValue();
        jest.spyOn(fs, "rmSync").mockImplementation(() => undefined);
        const writeBufferSpy = jest.spyOn(FileService.prototype, "writeBufferToFileWithGivenName").mockImplementation(() => undefined);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, true, "my-branch");

        expect(extractTempSpy).toHaveBeenCalledTimes(1);
        expect(pushToBranchSpy).toHaveBeenCalledWith(extractedDirectory, "my-branch", PACKAGE_ENTRIES);
        expect(writeBufferSpy).not.toHaveBeenCalled();
        expect(loggingTestTransport.logMessages[0].message).toContain("Successfully exported package to branch: my-branch");
    });

    it("Should leave out the package key, variables.json and node spaces when --portable is set", async () => {
        mockAxiosGet(EXPORT_URL, buildPackageZipWithTargetValues());
        const extractSpy = jest.spyOn(FileService.prototype, "extractZipBufferToDirectory").mockImplementation(() => undefined);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, false, null, true);

        const exportedZip = new AdmZip(extractSpy.mock.calls[0][0] as Buffer);
        expect(exportedZip.getEntry("variables.json")).toBeNull();

        const packageJson = readJsonEntry(exportedZip, "package.json");
        expect(packageJson.key).toBeUndefined();
        expect(packageJson.name).toEqual("My Package");
        expect(packageJson.additionalFields).toEqual({ spaceId: "package-space" });

        expect(readJsonEntry(exportedZip, "nodes/node-1.json")).toEqual({
            key: "node-1",
            type: "VIEW",
            additionalFields: { order: 0 },
        });
        expect(readJsonEntry(exportedZip, "nodes/node-2.json")).toEqual({ key: "node-2", type: "VIEW" });
    });

    it("Should keep the export unchanged when Pacman already returns a portable file", async () => {
        const zip = new AdmZip();
        zip.addFile("package.json", Buffer.from(JSON.stringify({ name: "My Package", type: "PACKAGE" })));
        zip.addFile("nodes/", Buffer.alloc(0));
        zip.addFile("nodes/node-1.json", Buffer.from(JSON.stringify({ key: "node-1", type: "VIEW" })));
        mockAxiosGet(EXPORT_URL, zip.toBuffer());
        const extractSpy = jest.spyOn(FileService.prototype, "extractZipBufferToDirectory").mockImplementation(() => undefined);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, false, null, true);

        const exportedZip = new AdmZip(extractSpy.mock.calls[0][0] as Buffer);
        expect(exportedZip.getEntry("package.json").getData().toString("utf-8"))
            .toEqual(JSON.stringify({ name: "My Package", type: "PACKAGE" }));
        expect(readJsonEntry(exportedZip, "nodes/node-1.json")).toEqual({ key: "node-1", type: "VIEW" });
    });

    it("Should zip the portable package when --portable and --zip are set", async () => {
        mockAxiosGet(EXPORT_URL, buildPackageZipWithTargetValues());

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, true, null, true);

        const exportedZip = new AdmZip(readFileSync(path.resolve(process.cwd(), `${PACKAGE_KEY}.zip`)));
        expect(exportedZip.getEntry("variables.json")).toBeNull();
        expect(readJsonEntry(exportedZip, "package.json").key).toBeUndefined();
    });

    it("Should push the portable package to the Git branch when --portable and --gitBranch are set", async () => {
        mockAxiosGet(EXPORT_URL, buildPackageZipWithTargetValues());
        const extractTempSpy = jest.spyOn(FileService.prototype, "extractZipBufferToTempDirectory").mockReturnValue("/tmp/portable");
        const pushToBranchSpy = jest.spyOn(GitService.prototype, "pushToBranch").mockResolvedValue();
        jest.spyOn(fs, "rmSync").mockImplementation(() => undefined);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, false, "my-branch", true);

        const pushedZip = new AdmZip(extractTempSpy.mock.calls[0][0] as Buffer);
        expect(pushedZip.getEntry("variables.json")).toBeNull();
        expect(readJsonEntry(pushedZip, "package.json").key).toBeUndefined();
        expect(pushToBranchSpy).toHaveBeenCalledWith("/tmp/portable", "my-branch", PACKAGE_ENTRIES);
    });

    it("Should write the package key and staging variable values to the target file when --targetFile is set", async () => {
        mockAxiosGet(EXPORT_URL, buildPackageZipWithTargetValues());
        mockAxiosPost(STAGING_VARIABLES_URL, [
            { packageKey: "other-pkg", variables: [{ key: "x", type: "PLAIN_TEXT", value: "y", metadata: {} }] },
            { packageKey: PACKAGE_KEY, variables: [{ key: "dm", type: "DATA_MODEL", value: "dm-1", metadata: { a: 1 } }] },
        ]);
        jest.spyOn(FileService.prototype, "extractZipBufferToDirectory").mockImplementation(() => undefined);
        const writeSpy = jest.spyOn(FileService.prototype, "writeToFileWithGivenName").mockImplementation(() => undefined);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, false, null, true, "targets/dev.json");

        expect(JSON.parse(mockedPostRequestBodyByUrl.get(STAGING_VARIABLES_URL))).toEqual([PACKAGE_KEY]);
        expect(writeSpy).toHaveBeenCalledTimes(1);
        const [content, fileName] = writeSpy.mock.calls[0];
        expect(fileName).toEqual("targets/dev.json");
        expect(JSON.parse(content)).toEqual({
            packageKey: PACKAGE_KEY,
            variables: [{ key: "dm", type: "DATA_MODEL", value: "dm-1" }],
        });
        expect(loggingTestTransport.logMessages[0].message).toContain("Target file written: targets/dev.json");
    });

    it("Should write a target file with no variables when the package has none", async () => {
        mockAxiosGet(EXPORT_URL, buildSinglePackageZip());
        mockAxiosPost(STAGING_VARIABLES_URL, [{ packageKey: PACKAGE_KEY }]);
        jest.spyOn(FileService.prototype, "extractZipBufferToDirectory").mockImplementation(() => undefined);
        const writeSpy = jest.spyOn(FileService.prototype, "writeToFileWithGivenName").mockImplementation(() => undefined);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, false, null, false, "target.json");

        expect(JSON.parse(writeSpy.mock.calls[0][0])).toEqual({ packageKey: PACKAGE_KEY, variables: [] });
    });

    it("Should not request staging variables when --targetFile is not set", async () => {
        mockAxiosGet(EXPORT_URL, buildSinglePackageZip());
        jest.spyOn(FileService.prototype, "extractZipBufferToDirectory").mockImplementation(() => undefined);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, false, null, true);

        expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
    });
});
