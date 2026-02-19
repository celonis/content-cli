import * as path from "path";
import {
  mockCreateReadStream,
  mockExistsSync,
  mockReadFileSync,
} from "../../utls/fs-mock-utils";
import { PackageManifestTransport } from "../../../src/commands/configuration-management/interfaces/package-export.interfaces";
import {
  NodeConfigurationChangeType,
  PackageDiffMetadata,
  PackageDiffTransport,
} from "../../../src/commands/configuration-management/interfaces/diff-package.interfaces";
import { mockAxiosPost } from "../../utls/http-requests-mock";
import { ConfigCommandService } from "../../../src/commands/configuration-management/config-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { ConfigUtils } from "../../utls/config-utils";

describe("Config diff", () => {
  beforeEach(() => {
    mockExistsSync();
  });

  it("Should show on terminal if packages have changes with hasChanges set to true and jsonResponse false", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor("package-key", "STUDIO"),
    );

    const firstPackageNode = ConfigUtils.buildPackageNode("package-key", {
      metadata: { description: "test" },
      variables: [],
      dependencies: [],
    });
    const firstChildNode = ConfigUtils.buildChildNode(
      "key-1",
      "package-key",
      "TEST",
    );
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [firstChildNode],
      "1.0.0",
    );
    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
    ]);

    mockReadFileSync(exportedPackagesZip.toBuffer());
    mockCreateReadStream(exportedPackagesZip.toBuffer());

    const diffResponse: PackageDiffMetadata[] = [
      {
        packageKey: "package-key",
        hasChanges: true,
      },
    ];

    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/diff/configuration/has-changes",
      diffResponse,
    );

    await new ConfigCommandService(testContext).diffPackages(
      "./packages.zip",
      true,
      false,
    );

    expect(loggingTestTransport.logMessages.length).toBe(1);
    expect(loggingTestTransport.logMessages[0].message).toContain(
      JSON.stringify(diffResponse, null, 2),
    );
  });

  it("Should show diff on terminal with hasChanges set to false and jsonResponse false", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor("package-key", "STUDIO"),
    );

    const firstPackageNode = ConfigUtils.buildPackageNode("package-key", {
      metadata: { description: "test" },
      variables: [],
      dependencies: [],
    });
    const firstChildNode = ConfigUtils.buildChildNode(
      "key-1",
      "package-key",
      "TEST",
    );
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [firstChildNode],
      "1.0.0",
    );
    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
    ]);

    mockReadFileSync(exportedPackagesZip.toBuffer());
    mockCreateReadStream(exportedPackagesZip.toBuffer());

    const diffResponse: PackageDiffTransport[] = [
      {
        packageKey: "package-key",
        packageChanges: [
          {
            op: "add",
            path: "/test",
            from: "bbbb",
            value: JSON.parse("123"),
            fromValue: null,
          },
        ],
        nodesWithChanges: [
          {
            nodeKey: firstChildNode.key,
            name: firstChildNode.name,
            type: firstChildNode.type,
            changeType: NodeConfigurationChangeType.ADDED,
            changes: [
              {
                op: "add",
                path: "/test",
                from: "bbb",
                value: JSON.parse("234"),
                fromValue: null,
              },
            ],
          },
        ],
      },
    ];

    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/diff/configuration",
      diffResponse,
    );

    await new ConfigCommandService(testContext).diffPackages(
      "./packages.zip",
      false,
      false,
    );

    expect(loggingTestTransport.logMessages.length).toBe(1);
    expect(loggingTestTransport.logMessages[0].message).toContain(
      JSON.stringify(diffResponse, null, 2),
    );
  });

  it("Should generate a json file with diff info when hasChanges is set to false and jsonResponse is set to true", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor("package-key", "STUDIO"),
    );

    const firstPackageNode = ConfigUtils.buildPackageNode("package-key", {
      metadata: { description: "test" },
      variables: [],
      dependencies: [],
    });
    const firstChildNode = ConfigUtils.buildChildNode(
      "key-1",
      "package-key",
      "TEST",
    );
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [firstChildNode],
      "1.0.0",
    );
    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
    ]);

    mockReadFileSync(exportedPackagesZip.toBuffer());
    mockCreateReadStream(exportedPackagesZip.toBuffer());

    const diffResponse: PackageDiffTransport[] = [
      {
        packageKey: "package-key",
        packageChanges: [
          {
            op: "add",
            path: "/test",
            from: "bbbb",
            value: JSON.parse("123"),
            fromValue: null,
          },
        ],
        nodesWithChanges: [
          {
            nodeKey: firstChildNode.key,
            name: firstChildNode.name,
            type: firstChildNode.type,
            changeType: NodeConfigurationChangeType.ADDED,
            changes: [
              {
                op: "add",
                path: "/test",
                from: "bbb",
                value: JSON.parse("234"),
                fromValue: null,
              },
            ],
          },
        ],
      },
    ];

    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/diff/configuration",
      diffResponse,
    );

    await new ConfigCommandService(testContext).diffPackages(
      "./packages.zip",
      false,
      true,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      expect.any(String),
      { encoding: "utf-8" },
    );
    const exportedPackageDiffTransport = JSON.parse(
      mockWriteFileSync.mock.calls[0][1],
    ) as PackageDiffTransport[];
    expect(exportedPackageDiffTransport.length).toBe(1);

    const exportedFirstPackageDiffTransport =
      exportedPackageDiffTransport.filter(
        diffTransport => diffTransport.packageKey === firstPackageNode.key,
      );
    expect(exportedFirstPackageDiffTransport).toEqual(diffResponse);
  });

  it("Should generate a json file with info whether packages have changes when hasChanges is set to true and jsonResponse is set to true", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor("package-key", "STUDIO"),
    );

    const firstPackageNode = ConfigUtils.buildPackageNode("package-key", {
      metadata: { description: "test" },
      variables: [],
      dependencies: [],
    });
    const firstChildNode = ConfigUtils.buildChildNode(
      "key-1",
      "package-key",
      "TEST",
    );
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [firstChildNode],
      "1.0.0",
    );
    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
    ]);

    mockReadFileSync(exportedPackagesZip.toBuffer());
    mockCreateReadStream(exportedPackagesZip.toBuffer());

    const diffResponse: PackageDiffMetadata[] = [
      {
        packageKey: "package-key",
        hasChanges: true,
      },
    ];

    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/diff/configuration/has-changes",
      diffResponse,
    );

    await new ConfigCommandService(testContext).diffPackages(
      "./packages.zip",
      true,
      true,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      expect.any(String),
      { encoding: "utf-8" },
    );
    const exportedPackageDiffTransport = JSON.parse(
      mockWriteFileSync.mock.calls[0][1],
    ) as PackageDiffTransport[];
    expect(exportedPackageDiffTransport.length).toBe(1);

    const exportedFirstPackageDiffTransport =
      exportedPackageDiffTransport.filter(
        diffTransport => diffTransport.packageKey === firstPackageNode.key,
      );
    expect(exportedFirstPackageDiffTransport).toEqual(diffResponse);
  });
});
