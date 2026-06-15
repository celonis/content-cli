import {
    PackageManifestTransport
} from "../../../src/commands/configuration-management/interfaces/package-export.interfaces";
import {
    NodeConfigurationChangeType,
    PackageDiffMetadata,
    PackageDiffTransport,
} from "../../../src/commands/configuration-management/interfaces/diff-package.interfaces";
import { mockAxiosPost } from "../../utls/http-requests-mock";
import { T2tcCommandService } from "../../../src/commands/t2tc/t2tc-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { ConfigUtils } from "../../utls/config-utils";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

function mockZipDiff(expectedUrl: string): PackageDiffTransport[] {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("package-key", "STUDIO"));

    const firstPackageNode = ConfigUtils.buildPackageNode("package-key", {metadata: {description: "test"}, variables: [], dependencies: []});
    const firstChildNode = ConfigUtils.buildChildNode("key-1", "package-key", "TEST");
    const firstPackageZip = ConfigUtils.buildExportPackageZip(firstPackageNode, [firstChildNode], "1.0.0");
    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [firstPackageZip]);
    exportedPackagesZip.writeZip("packages.zip");

    const diffResponse: PackageDiffTransport[] = [{
        packageKey: "package-key",
        packageChanges: [
            {
                op: "add",
                path: "/test",
                from: "bbbb",
                value: JSON.parse("123"),
                fromValue: null
            }],
        nodesWithChanges: [{
            nodeKey: firstChildNode.key,
            name: firstChildNode.name,
            type: firstChildNode.type,
            changeType: NodeConfigurationChangeType.ADDED,
            changes: [{
                op: "add",
                path: "/test",
                from: "bbb",
                value: JSON.parse("234"),
                fromValue: null
            }]
        }]
    }];

    mockAxiosPost(expectedUrl, diffResponse);
    return diffResponse;
}

describe("Config diff", () => {

    it("Should show on terminal if packages have changes with hasChanges set to true and jsonResponse false", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("package-key", "STUDIO"));

        const firstPackageNode = ConfigUtils.buildPackageNode("package-key", {metadata: {description: "test"}, variables: [], dependencies: []});
        const firstChildNode = ConfigUtils.buildChildNode("key-1", "package-key", "TEST");
        const firstPackageZip = ConfigUtils.buildExportPackageZip(firstPackageNode, [firstChildNode], "1.0.0");
        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [firstPackageZip]);
        exportedPackagesZip.writeZip("packages.zip");

        const diffResponse: PackageDiffMetadata[] = [{
            packageKey: "package-key",
            hasChanges: true
        }];

        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/diff/configuration/has-changes", diffResponse);

        await new T2tcCommandService(testContext).diffPackages("./packages.zip", true, null, false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            JSON.stringify(diffResponse, null, 2)
        );
    });

    it("Should show diff on terminal with hasChanges set to false and jsonResponse false", async () => {
        const diffResponse = mockZipDiff("https://myTeam.celonis.cloud/package-manager/api/core/packages/diff/configuration");

        await new T2tcCommandService(testContext).diffPackages("./packages.zip", false, null, false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            JSON.stringify(diffResponse, null, 2)
        );
    });

    it("Should compare with specified version", async () => {
        const diffResponse = mockZipDiff("https://myTeam.celonis.cloud/package-manager/api/core/packages/diff/configuration?baseVersion=1.0.0");

        await new T2tcCommandService(testContext).diffPackages("./packages.zip", false, "1.0.0", false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            JSON.stringify(diffResponse, null, 2)
        );
    });

    it("Should generate a json file with diff info when hasChanges is set to false and jsonResponse is set to true", async () => {
        const diffResponse = mockZipDiff("https://myTeam.celonis.cloud/package-manager/api/core/packages/diff/configuration");

        await new T2tcCommandService(testContext).diffPackages("./packages.zip", false, null, true);

        const exportedPackageDiffTransport = getJsonFromDownloadedFile() as PackageDiffTransport[];
        expect(exportedPackageDiffTransport.length).toBe(1);

        const exportedFirstPackageDiffTransport = exportedPackageDiffTransport.filter(diffTransport => diffTransport.packageKey === "package-key");
        expect(exportedFirstPackageDiffTransport).toEqual(diffResponse);
    });

    it("Should generate a json file with info whether packages have changes when hasChanges is set to true and jsonResponse is set to true", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("package-key", "STUDIO"));

        const firstPackageNode = ConfigUtils.buildPackageNode("package-key", {metadata: {description: "test"}, variables: [], dependencies: []});
        const firstChildNode = ConfigUtils.buildChildNode("key-1", "package-key", "TEST");
        const firstPackageZip = ConfigUtils.buildExportPackageZip(firstPackageNode, [firstChildNode], "1.0.0");
        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [firstPackageZip]);
        exportedPackagesZip.writeZip("packages.zip");

        const diffResponse: PackageDiffMetadata[] = [{
            packageKey: "package-key",
            hasChanges: true
        }];

        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/diff/configuration/has-changes", diffResponse);

        await new T2tcCommandService(testContext).diffPackages("./packages.zip", true, null, true);

        const exportedPackageDiffTransport = getJsonFromDownloadedFile() as PackageDiffTransport[];
        expect(exportedPackageDiffTransport.length).toBe(1);

        const exportedFirstPackageDiffTransport = exportedPackageDiffTransport.filter(diffTransport => diffTransport.packageKey === firstPackageNode.key);
        expect(exportedFirstPackageDiffTransport).toEqual(diffResponse);
    });
});