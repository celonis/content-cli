import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import AdmZip = require("adm-zip");
import { mockAxiosGet, mockAxiosGetWithStatus, mockAxiosPost } from "../utls/http-requests-mock";
import { testContext } from "../utls/test-context";
import { loggingTestTransport } from "../jest.setup";
import { FileService } from "../../src/core/utils/file-service";
import { CuiFileService } from "../../src/core/utils/cui-file-service";
import { ConfigUtils } from "../utls/config-utils";
import { zipToTempFolder } from "../utls/fs-utils";
import { DeploymentService } from "../../src/commands/deployment/deployment.service";
import { NodeService } from "../../src/commands/configuration-management/node.service";
import { BranchCommandService } from "../../src/commands/configuration-management/branch/branch.command.service";
import { ConfigCommandService } from "../../src/commands/configuration-management/config-command.service";
import { AssetRegistryService } from "../../src/commands/asset-registry/asset-registry.service";
import { T2tcCommandService } from "../../src/commands/t2tc/t2tc-command.service";
import { DataPoolService } from "../../src/commands/data-pipeline/data-pool/data-pool-service";
import { MetadataService } from "../../src/commands/configuration-management/metadata.service";
import { PackageValidationService } from "../../src/commands/configuration-management/package-validation.service";
import { PackageManifestTransport } from "../../src/commands/configuration-management/interfaces/package-export.interfaces";

const COVER_URL = "https://myTeam.celonis.cloud/api/team/cui-settings/cui-pdf-cover";
const PDF_BYTES = Buffer.from("%PDF-1.4 cover sheet");

function markAsClassified(): void {
    mockAxiosGetWithStatus(COVER_URL, 200, {
        resolvedCuiMarking: { categories: [{ code: "PRVCY", name: "Privacy" }] },
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

describe("CUI marking of --json commands", () => {

    beforeEach(() => {
        markAsClassified();
    });

    it("Should mark deployment listings", async () => {
        const targets = [{ id: "target-1", name: "First target" }];
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/deployments/targets?deployableType=app-package&packageKey=package-key", targets);

        await new DeploymentService(testContext).getTargets(true, "app-package", "package-key");

        expect(markedPayload()).toEqual(targets);
    });

    it("Should mark configuration node listings", async () => {
        const nodes = [{ id: "node-id-1", key: "node-key-1", name: "Node 1" }];
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/packages/package-key/nodes?version=1.0.0&withConfiguration=false&limit=10", nodes);

        await new NodeService(testContext).listNodes("package-key", "1.0.0", 10, 0, false, true);

        expect(markedPayload()).toEqual(nodes);
    });

    it("Should mark branch listings", async () => {
        const branches = [{ projectKey: "my-package", branchKey: "feature-a", packageKey: "my-package@feature-a" }];
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/packages/my-package/branches", branches);

        await new BranchCommandService(testContext).listBranches("my-package", true);

        expect(markedPayload()).toEqual(branches);
    });

    it("Should mark staging variable exports", async () => {
        const manifests = [{ packageKey: "pkg-a", variables: [{ key: "DATA_POOL", type: "SINGLE_VALUE", value: "pool-id", metadata: {} }] }];
        mockAxiosPost("https://myTeam.celonis.cloud/pacman/api/core/staging/packages/variables/by-package-keys", manifests);

        await new ConfigCommandService(testContext).listVariables(true, [], "", ["pkg-a"]);

        expect(markedPayload()).toEqual(manifests);
    });

    it("Should mark asset registry responses", async () => {
        const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" };
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/schemas/BOARD_V2", schema);

        await new AssetRegistryService(testContext).getSchema("BOARD_V2", true);

        expect(markedPayload()).toEqual(schema);
    });

    it("Should mark t2tc package listings", async () => {
        const packages = [{ key: "key-1", name: "Package 1", flavor: "STUDIO" }];
        const urlParams = new URLSearchParams({ includeBranches: "false" });
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/staging/packages/export/list?" + urlParams.toString(), packages);

        await new T2tcCommandService(testContext).listPackages(true, null, false, [], undefined, null, null, false, true);

        expect(markedPayload()).toEqual(packages);
    });

    it("Should mark t2tc package diffs", async () => {
        const diff = [{ packageKey: "package-key", hasChanges: true }];
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/diff/configuration/has-changes", diff);

        const manifest: PackageManifestTransport[] = [ConfigUtils.buildManifestForKeyAndFlavor("package-key", "STUDIO")];
        const source = zipToTempFolder(ConfigUtils.buildBatchExportZip(manifest, []));

        await new T2tcCommandService(testContext).diffPackages(source, true, null, true);

        expect(markedPayload()).toEqual(diff);
    });

    it("Should mark data pool listings", async () => {
        const pool = { id: "pool-1", name: "Pool 1" };
        mockAxiosGet("https://myTeam.celonis.cloud/integration/api/pools/paged?limit=100&page=0", { pageNumber: 0, totalCount: 1, content: [pool] });
        mockAxiosGet("https://myTeam.celonis.cloud/integration/api/pools/paged?limit=100&page=1", { pageNumber: 1, totalCount: 1, content: [] });

        await new DataPoolService(testContext).findAndExportAllPools();

        expect(markedPayload()).toEqual([pool]);
    });

    it("Should mark package metadata exports", async () => {
        const metadata = [{ key: "package-key-1", hasUnpublishedChanges: true }];
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/metadata/export?packageKeys=package-key-1", metadata);

        await new MetadataService(testContext).exportPackagesMetadata(["package-key-1"], true);

        expect(markedPayload()).toEqual(metadata);
    });

    it("Should mark package validation reports", async () => {
        const report = { packageKey: "my-package", valid: true, summary: { errors: 0, warnings: 0, info: 0 }, results: [] };
        mockAxiosPost("https://myTeam.celonis.cloud/pacman/api/core/packages/my-package/validate", report);

        await new PackageValidationService(testContext).validatePackage("my-package", ["SCHEMA"], null, true);

        expect(markedPayload("Validation report file: ")).toEqual(report);
    });
});
