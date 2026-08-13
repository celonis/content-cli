import { resolve } from "node:path";
import * as fs from "node:fs";
import { readFileSync } from "node:fs";
import * as os from "node:os";
import { Readable } from "stream";
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
import { ActionFlowCommandService } from "../../src/commands/action-flows/action-flow/action-flow-command.service";
import { PackageCommandService } from "../../src/commands/studio/command-service/package-command.service";
import { PackageManifestTransport } from "../../src/commands/configuration-management/interfaces/package-export.interfaces";

const COVER_URL = "https://myTeam.celonis.cloud/api/team/cui-settings/cui-pdf-cover";
const PDF_BYTES = Buffer.from("%PDF-1.4 cover sheet");

const PACKAGE_KEY = "pkg-1";
const BRANCH = "feature-a";
const PACKAGE_ID = "123-456-789";
const T2TC_DOWNLOAD_MESSAGE = "File downloaded successfully. New filename: ";

function markAsClassified(): void {
    mockAxiosGetWithStatus(COVER_URL, 200, {
        coverPage: { pdfContent: PDF_BYTES.toString("base64"), encoding: "base64" },
    });
}

function loggedFileName(prefix: string = FileService.fileDownloadedMessage): string {
    const message = loggingTestTransport.logMessages.map(entry => entry.message).find(entry => entry.includes(prefix));
    return message.split(prefix)[1];
}

function markedArchive(prefix?: string): AdmZip {
    const filename = loggedFileName(prefix);
    expect(filename.startsWith(CuiFileService.CLASSIFIED_PREFIX)).toBe(true);
    expect(filename.endsWith(".zip")).toBe(true);

    const archive = new AdmZip(readFileSync(resolve(process.cwd(), filename)));
    expect(archive.getEntry(CuiFileService.COVER_SHEET_FILE_NAME).getData().equals(PDF_BYTES)).toBe(true);

    return archive;
}

function entryNames(archive: AdmZip): string[] {
    return archive.getEntries().map(entry => entry.entryName).sort();
}

function buildPackageZip(): Buffer {
    const zip = new AdmZip();
    zip.addFile("package.json", Buffer.from(JSON.stringify({ key: PACKAGE_KEY, name: "My Package" })));
    zip.addFile("nodes/node-1.json", Buffer.from(JSON.stringify({ key: "node-1", type: "VIEW" })));
    return zip.toBuffer();
}

function seedPackageDir(packageKey: string): string {
    const dir = fs.mkdtempSync(resolve(os.tmpdir(), "cui-zip-test-"));
    fs.mkdirSync(resolve(dir, "nodes"));
    fs.writeFileSync(resolve(dir, "package.json"), JSON.stringify({ key: packageKey, name: "My Package" }));
    fs.writeFileSync(resolve(dir, "nodes", "root.json"), JSON.stringify({ key: "root", type: "FOLDER" }));
    return dir;
}

describe("CUI marking of archive exports", () => {

    beforeEach(() => {
        markAsClassified();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("Should mark the archive of config package export --zip", async () => {
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/export-file`, buildPackageZip());

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, true, null);

        expect(loggedFileName()).toEqual(`${CuiFileService.CLASSIFIED_PREFIX}${PACKAGE_KEY}.zip`);
        expect(entryNames(markedArchive())).toEqual([
            CuiFileService.COVER_SHEET_FILE_NAME,
            "nodes/node-1.json",
            "package.json",
        ]);
    });

    it("Should mark the archive of config branch export --zip", async () => {
        const branchPackageKey = `${PACKAGE_KEY}@${BRANCH}`;
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${branchPackageKey}/export-file`, buildPackageZip());
        jest.spyOn(FileService.prototype, "extractZipBufferToTempDirectory").mockReturnValue(seedPackageDir(branchPackageKey));

        await new BranchExportImportCommandService(testContext).exportBranch(PACKAGE_KEY, BRANCH, { zip: true });

        expect(loggedFileName()).toEqual(`${CuiFileService.CLASSIFIED_PREFIX}${PACKAGE_KEY}.zip`);

        const archive = markedArchive();
        expect(entryNames(archive)).toContain("package.json");
        expect(JSON.parse(archive.getEntry("package.json").getData().toString()).key).toEqual(PACKAGE_KEY);
    });

    it("Should mark the archive of t2tc package export", async () => {
        const manifest: PackageManifestTransport[] = [ConfigUtils.buildManifestForKeyAndFlavor("key-1", "TEST")];
        mockAxiosGet(
            "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&withDependencies=false",
            ConfigUtils.buildBatchExportZip(manifest, []).toBuffer()
        );
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments", []);

        await new T2tcCommandService(testContext).batchExportPackages(["key-1"], undefined, false, null, false);

        expect(entryNames(markedArchive(T2TC_DOWNLOAD_MESSAGE))).toContain("manifest.json");
    });

    it("Should mark the archive of export action-flows", async () => {
        const actionFlowFileName = "20240711-scenario-1234.json";
        const actionFlows = new AdmZip();
        actionFlows.addFile(actionFlowFileName, Buffer.from(JSON.stringify({ name: "Automation" })));
        mockAxiosGet(`https://myTeam.celonis.cloud/ems-automation/api/root/${PACKAGE_ID}/export/assets`, actionFlows.toBuffer());

        await new ActionFlowCommandService(testContext).exportActionFlows(PACKAGE_ID, null);

        expect(entryNames(markedArchive())).toEqual([actionFlowFileName, CuiFileService.COVER_SHEET_FILE_NAME].sort());
    });

    it("Should mark the archive of the deprecated pull package", async () => {
        mockAxiosPost(
            `https://myTeam.celonis.cloud/package-manager/api/packages/${PACKAGE_KEY}/export?store=false&draft=false`,
            Readable.from(buildPackageZip())
        );

        await new PackageCommandService(testContext).pullPackage(PACKAGE_KEY, false, null, false);

        expect(loggedFileName()).toEqual(`${CuiFileService.CLASSIFIED_PREFIX}package_${PACKAGE_KEY}.zip`);
        expect(entryNames(markedArchive())).toEqual([
            CuiFileService.COVER_SHEET_FILE_NAME,
            "nodes/node-1.json",
            "package.json",
        ]);
    });
});
