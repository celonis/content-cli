import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import AdmZip = require("adm-zip");
import { mockAxiosGet, mockAxiosGetWithStatus, mockAxiosPost } from "../utls/http-requests-mock";
import { testContext } from "../utls/test-context";
import { loggingTestTransport } from "../jest.setup";
import { FileService } from "../../src/core/utils/file-service";
import { CuiFileService } from "../../src/core/utils/cui-file-service";
import { ConfigUtils } from "../utls/config-utils";
import { writeJsonTempFile, zipToTempFolder } from "../utls/fs-utils";
import { ActionFlowCommandService } from "../../src/commands/action-flows/action-flow/action-flow-command.service";
import { DataPoolCommandService } from "../../src/commands/data-pipeline/data-pool/data-pool-command.service";
import { T2tcCommandService } from "../../src/commands/t2tc/t2tc-command.service";
import { PackageManifestTransport } from "../../src/commands/configuration-management/interfaces/package-export.interfaces";

const COVER_URL = "https://myTeam.celonis.cloud/api/team/cui-settings/cui-pdf-cover";
const PDF_BYTES = Buffer.from("%PDF-1.4 cover sheet");

const PACKAGE_ID = "123-456-789";
const POOL_ID = "pool-1";

function markAsClassified(): void {
    mockAxiosGetWithStatus(COVER_URL, 200, {
        coverPage: { pdfContent: PDF_BYTES.toString("base64"), encoding: "base64" },
    });
}

function loggedFileName(prefix: string = FileService.fileDownloadedMessage): string {
    const message = loggingTestTransport.logMessages.map(entry => entry.message).find(entry => entry.includes(prefix));
    return message.split(prefix)[1];
}

function payloadFromArchive(filename: string): any {
    expect(filename.startsWith(CuiFileService.CLASSIFIED_PREFIX)).toBe(true);
    expect(filename.endsWith(".zip")).toBe(true);

    const archive = new AdmZip(readFileSync(resolve(process.cwd(), filename)));
    expect(archive.getEntry(CuiFileService.COVER_SHEET_FILE_NAME).getData().equals(PDF_BYTES)).toBe(true);

    const payloadEntry = archive.getEntries().map(entry => entry.entryName).find(entry => entry.endsWith(".json"));
    return JSON.parse(archive.getEntry(payloadEntry).getData().toString());
}

function markedPayload(prefix?: string): any {
    return payloadFromArchive(loggedFileName(prefix));
}

function markAsUnclassified(): void {
    mockAxiosGetWithStatus(COVER_URL, 204, "");
}

function unclassifiedPayload(prefix?: string): any {
    const filename = loggedFileName(prefix);
    expect(filename.startsWith(CuiFileService.UNCLASSIFIED_PREFIX)).toBe(true);
    expect(filename.endsWith(".json")).toBe(true);

    return JSON.parse(readFileSync(resolve(process.cwd(), filename), "utf-8"));
}

describe("CUI marking of --outputToJsonFile commands", () => {

    beforeEach(() => {
        markAsClassified();
    });

    it("Should mark the action flows analyze metadata", async () => {
        const metadata = { actionFlows: [{ key: "987_asset_key", name: "Automation" }], connections: [] };
        mockAxiosGet(`https://myTeam.celonis.cloud/ems-automation/api/root/${PACKAGE_ID}/export/assets/analyze`, metadata);

        await new ActionFlowCommandService(testContext).analyzeActionFlows(PACKAGE_ID, true);

        expect(markedPayload()).toEqual(metadata);
    });

    it("Should mark the action flows import event log", async () => {
        const eventLog = { status: "SUCCESS", eventLog: [{ status: "SUCCESS", assetType: "SCENARIO" }] };
        mockAxiosPost(`https://myTeam.celonis.cloud/ems-automation/api/root/${PACKAGE_ID}/import/assets`, eventLog);

        await new ActionFlowCommandService(testContext).importActionFlows(PACKAGE_ID, zipToTempFolder(new AdmZip()), true, true);

        expect(markedPayload()).toEqual(eventLog);
    });

    it("Should mark the exported data pool", async () => {
        const dataPool = { id: POOL_ID, name: "Pool 1", objects: [] };
        mockAxiosGet(`https://myTeam.celonis.cloud/integration/api/pools/${POOL_ID}/v2/export`, dataPool);

        await new DataPoolCommandService(testContext).exportDataPool(POOL_ID, true);

        expect(markedPayload()).toEqual(dataPool);
    });

    it("Should only prefix the report when the content is unclassified", async () => {
        markAsUnclassified();
        const dataPool = { id: POOL_ID, name: "Pool 1", objects: [] };
        mockAxiosGet(`https://myTeam.celonis.cloud/integration/api/pools/${POOL_ID}/v2/export`, dataPool);

        await new DataPoolCommandService(testContext).exportDataPool(POOL_ID, true);

        expect(unclassifiedPayload()).toEqual(dataPool);
    });

    it("Should mark the data pool batch import report", async () => {
        const report = { installedVersions: [{ poolId: POOL_ID, version: "1.0.0" }] };
        mockAxiosPost("https://myTeam.celonis.cloud/integration/api/pool/batch-import", report);

        const requestFile = "data-pool-batch-import-request.json";
        writeJsonTempFile(requestFile, { pools: [{ id: POOL_ID }] });

        await new DataPoolCommandService(testContext).batchImportDataPools(requestFile, true);

        expect(markedPayload("Batch import report file: ")).toEqual(report);
    });

    it("Should mark the t2tc package import report", async () => {
        const manifest: PackageManifestTransport[] = [ConfigUtils.buildManifestForKeyAndFlavor("key-1", "TEST")];
        const zipPath = zipToTempFolder(ConfigUtils.buildBatchExportZip(manifest, []));

        const importReport = [{ packageKey: "key-1", importedVersions: [{ oldVersion: "1.0.2", newVersion: "1.0.0" }] }];
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages", []);
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch", importReport);

        await new T2tcCommandService(testContext).batchImportPackages(zipPath, null, true, null);

        expect(markedPayload("Config import report file: ")).toEqual(importReport);
    });
});
