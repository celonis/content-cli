import { resolve } from "node:path";
import * as fs from "node:fs";
import { existsSync, readFileSync } from "node:fs";
import * as os from "node:os";
import AdmZip = require("adm-zip");
import { mockAxiosGet, mockAxiosGetWithStatus, mockAxiosPost } from "../utls/http-requests-mock";
import { testContext } from "../utls/test-context";
import { loggingTestTransport } from "../jest.setup";
import { FileService } from "../../src/core/utils/file-service";
import { CuiFileService } from "../../src/core/utils/cui-file-service";
import { ConfigUtils } from "../utls/config-utils";
import { SinglePackageExportService } from "../../src/commands/configuration-management/single-package-export.service";
import { BranchExportImportCommandService } from "../../src/commands/configuration-management/branch/branch-export-import.command.service";
import { T2tcCommandService } from "../../src/commands/t2tc/t2tc-command.service";
import { PackageManifestTransport } from "../../src/commands/configuration-management/interfaces/package-export.interfaces";

const COVER_URL = "https://myTeam.celonis.cloud/api/team/cui-settings/cui-pdf-cover";
const PDF_BYTES = Buffer.from("%PDF-1.4 cover sheet");

const EXPORT_MESSAGE = "Successful export. Exported directory: ";
const DOWNLOAD_MESSAGE = "Successful download. Downloaded directory: ";
const BRANCH = "feature-a";

function markAsClassified(): void {
    mockAxiosGetWithStatus(COVER_URL, 200, {
        coverPage: { pdfContent: PDF_BYTES.toString("base64"), encoding: "base64" },
    });
}

function loggedDirectoryName(prefix: string): string {
    const message = loggingTestTransport.logMessages.map(entry => entry.message).find(entry => entry.includes(prefix));
    return message.split(prefix)[1];
}

function markedDirectory(prefix: string, expectedName: string): string {
    const directoryName = loggedDirectoryName(prefix);
    expect(directoryName).toEqual(`${CuiFileService.CLASSIFIED_PREFIX}${expectedName}`);

    const coverSheet = readFileSync(resolve(process.cwd(), directoryName, CuiFileService.COVER_SHEET_FILE_NAME));
    expect(coverSheet.equals(PDF_BYTES)).toBe(true);

    return directoryName;
}

function exists(...segments: string[]): boolean {
    return existsSync(resolve(process.cwd(), ...segments));
}

function markAsUnclassified(): void {
    mockAxiosGetWithStatus(COVER_URL, 204, "");
}

function unclassifiedDirectory(prefix: string, expectedName: string): string {
    const directoryName = loggedDirectoryName(prefix);
    expect(directoryName).toEqual(`${CuiFileService.UNCLASSIFIED_PREFIX}${expectedName}`);

    return directoryName;
}

function buildPackageZip(packageKey: string): Buffer {
    const zip = new AdmZip();
    zip.addFile("package.json", Buffer.from(JSON.stringify({ key: packageKey, name: "My Package" })));
    zip.addFile("nodes/node-1.json", Buffer.from(JSON.stringify({ key: "node-1", type: "VIEW" })));
    return zip.toBuffer();
}

function seedPackageDir(packageKey: string): string {
    const dir = fs.mkdtempSync(resolve(os.tmpdir(), "cui-dir-test-"));
    fs.mkdirSync(resolve(dir, "nodes"));
    fs.writeFileSync(resolve(dir, "package.json"), JSON.stringify({ key: packageKey, name: "My Package" }));
    fs.writeFileSync(resolve(dir, "nodes", "root.json"), JSON.stringify({ key: "root", type: "FOLDER" }));
    return dir;
}

describe("CUI marking of directory exports", () => {

    beforeEach(() => {
        markAsClassified();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("Should mark the directory of config package export", async () => {
        const packageKey = "pkg-export";
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/export-file`, buildPackageZip(packageKey));

        await new SinglePackageExportService(testContext).exportPackage(packageKey, false, null);

        const directoryName = markedDirectory(EXPORT_MESSAGE, packageKey);
        expect(exists(directoryName, "package.json")).toBe(true);
        expect(exists(directoryName, "nodes", "node-1.json")).toBe(true);
        expect(exists(packageKey)).toBe(false);
    });

    it("Should only prefix the directory when the content is unclassified", async () => {
        markAsUnclassified();
        const packageKey = "pkg-unclassified";
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/export-file`, buildPackageZip(packageKey));

        await new SinglePackageExportService(testContext).exportPackage(packageKey, false, null);

        const directoryName = unclassifiedDirectory(EXPORT_MESSAGE, packageKey);
        expect(exists(directoryName, "nodes", "node-1.json")).toBe(true);
        expect(exists(directoryName, CuiFileService.COVER_SHEET_FILE_NAME)).toBe(false);
        expect(exists(packageKey)).toBe(false);
    });

    it("Should mark the directory of config branch export", async () => {
        const packageKey = "pkg-branch";
        const branchPackageKey = `${packageKey}@${BRANCH}`;
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${branchPackageKey}/export-file`, buildPackageZip(branchPackageKey));
        jest.spyOn(FileService.prototype, "extractZipBufferToTempDirectory").mockReturnValue(seedPackageDir(branchPackageKey));

        await new BranchExportImportCommandService(testContext).exportBranch(packageKey, BRANCH, {});

        const directoryName = markedDirectory(EXPORT_MESSAGE, packageKey);
        expect(exists(directoryName, "nodes", "root.json")).toBe(true);

        const exported = JSON.parse(readFileSync(resolve(process.cwd(), directoryName, "package.json"), "utf-8"));
        expect(exported.key).toEqual(packageKey);
        expect(exists(packageKey)).toBe(false);
    });

    it("Should mark the directory of t2tc package export --unzip", async () => {
        const manifest: PackageManifestTransport[] = [ConfigUtils.buildManifestForKeyAndFlavor("key-1", "TEST")];
        mockAxiosGet(
            "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&withDependencies=false",
            ConfigUtils.buildBatchExportZip(manifest, []).toBuffer()
        );
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments", []);

        await new T2tcCommandService(testContext).batchExportPackages(["key-1"], undefined, false, null, true);

        const directoryName = loggedDirectoryName(DOWNLOAD_MESSAGE);
        expect(directoryName.startsWith(`${CuiFileService.CLASSIFIED_PREFIX}export_`)).toBe(true);
        expect(exists(directoryName, "manifest.json")).toBe(true);

        const coverSheet = readFileSync(resolve(process.cwd(), directoryName, CuiFileService.COVER_SHEET_FILE_NAME));
        expect(coverSheet.equals(PDF_BYTES)).toBe(true);
    });
});
