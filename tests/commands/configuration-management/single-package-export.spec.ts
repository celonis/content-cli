import * as path from "path";
import * as fs from "node:fs";
import AdmZip = require("adm-zip");
import { mockAxiosGet, mockAxiosGetError, mockedAxiosInstance } from "../../utls/http-requests-mock";
import { SinglePackageExportService } from "../../../src/commands/configuration-management/single-package-export.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { GitService } from "../../../src/core/git-profile/git/git.service";
import { accessSync, readFileSync } from "node:fs";

const PACKAGE_KEY = "pkg-1";
const EXPORT_URL = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/export-file`;

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
        expect(pushToBranchSpy).toHaveBeenCalledWith(extractedDirectory, "my-branch");
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
        expect(pushToBranchSpy).toHaveBeenCalledWith(extractedDirectory, "my-branch");
        expect(writeBufferSpy).not.toHaveBeenCalled();
        expect(loggingTestTransport.logMessages[0].message).toContain("Successfully exported package to branch: my-branch");
    });
});
