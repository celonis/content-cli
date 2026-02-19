import * as fs from "fs";
import AdmZip = require("adm-zip");
import {
  mockAxiosGet,
  mockAxiosPost,
  mockedPostRequestBodyByUrl,
} from "../../utls/http-requests-mock";
import { BatchExportImportConstants } from "../../../src/commands/configuration-management/interfaces/batch-export-import.constants";
import {
  DependencyTransport,
  NodeConfiguration,
  NodeExportTransport,
  PackageManifestTransport,
  StudioPackageManifest,
  VariableManifestTransport,
} from "../../../src/commands/configuration-management/interfaces/package-export.interfaces";
import {
  PackageManagerVariableType,
  VariableDefinition,
  VariablesAssignments,
} from "../../../src/commands/studio/interfaces/package-manager.interfaces";
import { loggingTestTransport, mockWriteSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { parse, stringify } from "../../../src/core/utils/json";
import { ConfigCommandService } from "../../../src/commands/configuration-management/config-command.service";
import { testContext } from "../../utls/test-context";
import { ConfigUtils } from "../../utls/config-utils";
import { PacmanApiUtils } from "../../utls/pacman-api.utils";
import { mockReadDirSync } from "../../utls/fs-mock-utils";
import { GitService } from "../../../src/core/git-profile/git/git.service";

describe("Config export", () => {
  const firstSpace = PacmanApiUtils.buildSpaceTransport(
    "space-1",
    "First space",
    "Icon1",
  );
  const secondSpace = PacmanApiUtils.buildSpaceTransport(
    "space-2",
    "Second space",
    "Icon2",
  );

  let mockGitServicePushToBranch: jest.SpyInstance;

  beforeEach(() => {
    (fs.openSync as jest.Mock).mockReturnValue(100);
    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/spaces/space-1",
      { ...firstSpace },
    );
    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/spaces/space-2",
      { ...secondSpace },
    );

    mockGitServicePushToBranch = jest
      .spyOn(GitService.prototype, "pushToBranch")
      .mockResolvedValue();
  });

  it("Should export studio file for studio packageKeys", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-1",
        BatchExportImportConstants.STUDIO,
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-2",
        BatchExportImportConstants.STUDIO,
      ),
    );
    manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-3", "TEST"));
    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);

    const firstStudioPackage = PacmanApiUtils.buildContentNodeTransport(
      "key-1",
      "space-1",
    );
    const firstPackageRuntimeVariable: VariablesAssignments = {
      key: "varKey",
      type: PackageManagerVariableType.PLAIN_TEXT,
      value: "default-value" as unknown as object,
    };

    const secondStudioPackage = PacmanApiUtils.buildContentNodeTransport(
      "key-2",
      "space-2",
    );

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&packageKeys=key-3&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstStudioPackage.key}/${firstStudioPackage.key}`,
      firstStudioPackage,
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${secondStudioPackage.key}/${secondStudioPackage.key}`,
      secondStudioPackage,
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstStudioPackage.key}/variables/runtime-values?appMode=VIEWER`,
      [firstPackageRuntimeVariable],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondStudioPackage.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      ["key-1", "key-2", "key-3"],
      undefined,
      true,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const actualZip = new AdmZip(fileBuffer);

    const studioManifest: StudioPackageManifest[] = parse(
      actualZip
        .getEntry(BatchExportImportConstants.STUDIO_FILE_NAME)
        .getData()
        .toString(),
    );
    expect(studioManifest).toHaveLength(2);
    expect(studioManifest).toContainEqual({
      packageKey: firstStudioPackage.key,
      space: {
        name: firstSpace.name,
        iconReference: firstSpace.iconReference,
      },
      runtimeVariableAssignments: [firstPackageRuntimeVariable],
    });
    expect(studioManifest).toContainEqual({
      packageKey: secondStudioPackage.key,
      space: {
        name: secondSpace.name,
        iconReference: secondSpace.iconReference,
      },
      runtimeVariableAssignments: [],
    });
  });

  it("Should export to Github branch when branch is sent", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-1",
        BatchExportImportConstants.STUDIO,
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-2",
        BatchExportImportConstants.STUDIO,
      ),
    );
    manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-3", "TEST"));
    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);

    const firstStudioPackage = PacmanApiUtils.buildContentNodeTransport(
      "key-1",
      "space-1",
    );
    const firstPackageRuntimeVariable: VariablesAssignments = {
      key: "varKey",
      type: PackageManagerVariableType.PLAIN_TEXT,
      value: "default-value" as unknown as object,
    };

    const secondStudioPackage = PacmanApiUtils.buildContentNodeTransport(
      "key-2",
      "space-2",
    );

    mockReadDirSync(["manifest.json", "studio.json", "variables.json"]);

    (fs.mkdirSync as jest.Mock).mockImplementation(() => {
      // Mock implementation for mkdirSync
    });
    (fs.rmSync as jest.Mock).mockImplementation(() => {
      // Mock implementation for rmSync
    });

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&packageKeys=key-3&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstStudioPackage.key}/${firstStudioPackage.key}`,
      firstStudioPackage,
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${secondStudioPackage.key}/${secondStudioPackage.key}`,
      secondStudioPackage,
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstStudioPackage.key}/variables/runtime-values?appMode=VIEWER`,
      [firstPackageRuntimeVariable],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondStudioPackage.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    const branchName = "my-branch";
    await new ConfigCommandService(testContext).batchExportPackages(
      ["key-1", "key-2", "key-3"],
      undefined,
      true,
      branchName,
      null,
    );

    expect(mockGitServicePushToBranch).toHaveBeenCalledTimes(1);
    expect(mockGitServicePushToBranch).toHaveBeenCalledWith(
      expect.any(String),
      branchName,
    );
    const loggedResponse = loggingTestTransport.logMessages[0].message.trim();

    expect(loggedResponse).toEqual(
      "Successfully exported packages to branch: my-branch",
    );
  });

  it("Should export studio file for studio packageKeys and versions", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key-1",
        BatchExportImportConstants.STUDIO,
        "1.0.1",
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key-2",
        BatchExportImportConstants.STUDIO,
        "1.0.4",
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key-3",
        "TEST",
        "1.2.0",
      ),
    );
    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);

    const firstStudioPackage = PacmanApiUtils.buildContentNodeTransport(
      "key-1",
      "space-1",
    );
    const firstPackageRuntimeVariable: VariablesAssignments = {
      key: "varKey",
      type: PackageManagerVariableType.PLAIN_TEXT,
      value: "default-value" as unknown as object,
    };

    const secondStudioPackage = PacmanApiUtils.buildContentNodeTransport(
      "key-2",
      "space-2",
    );

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/versions/export/batch?packageKeysWithVersion=key-1.1.0.1&packageKeysWithVersion=key-2.1.0.4&packageKeysWithVersion=key-3.1.2.0&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstStudioPackage.key}/${firstStudioPackage.key}`,
      firstStudioPackage,
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${secondStudioPackage.key}/${secondStudioPackage.key}`,
      secondStudioPackage,
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstStudioPackage.key}/variables/runtime-values?appMode=VIEWER`,
      [firstPackageRuntimeVariable],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondStudioPackage.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      undefined,
      ["key-1.1.0.1", "key-2.1.0.4", "key-3.1.2.0"],
      true,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const actualZip = new AdmZip(fileBuffer);

    const studioManifest: StudioPackageManifest[] = parse(
      actualZip
        .getEntry(BatchExportImportConstants.STUDIO_FILE_NAME)
        .getData()
        .toString(),
    );
    expect(studioManifest).toHaveLength(2);
    expect(studioManifest).toContainEqual({
      packageKey: firstStudioPackage.key,
      space: {
        name: firstSpace.name,
        iconReference: firstSpace.iconReference,
      },
      runtimeVariableAssignments: [firstPackageRuntimeVariable],
    });
    expect(studioManifest).toContainEqual({
      packageKey: secondStudioPackage.key,
      space: {
        name: secondSpace.name,
        iconReference: secondSpace.iconReference,
      },
      runtimeVariableAssignments: [],
    });
  });

  it("Should export variables file with connection variables fixed", async () => {
    const firstPackageDependencies = new Map<string, DependencyTransport[]>();
    firstPackageDependencies.set("1.0.0", []);

    const secondPackageDependencies = new Map<string, DependencyTransport[]>();
    secondPackageDependencies.set("1.0.0", []);
    secondPackageDependencies.set("1.1.1", []);

    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-1",
        BatchExportImportConstants.STUDIO,
        firstPackageDependencies,
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-2",
        BatchExportImportConstants.STUDIO,
        secondPackageDependencies,
      ),
    );

    const firstPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key1-var",
        type: PackageManagerVariableType.DATA_MODEL,
        runtime: false,
      },
      {
        key: "key-1-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const firstPackageNode = ConfigUtils.buildPackageNode("key-1", {
      variables: firstPackageVariableDefinition,
    });
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [],
      "1.0.0",
    );

    const secondPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key2-var",
        type: PackageManagerVariableType.DATA_MODEL,
        runtime: false,
      },
      {
        key: "key-2-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const secondPackageNode = ConfigUtils.buildPackageNode("key-2", {
      variables: secondPackageVariableDefinition,
    });
    const secondPackageZip = ConfigUtils.buildExportPackageZip(
      secondPackageNode,
      [],
      "1.0.0",
    );

    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
      secondPackageZip,
    ]);

    const exportedVariables: VariableManifestTransport[] = [
      {
        packageKey: "key-1",
        version: "1.0.0",
        variables: [
          {
            key: "key1-var",
            type: PackageManagerVariableType.DATA_MODEL,
            value: "dm-id" as unknown as object,
            metadata: {},
          },
          {
            key: "key-1-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: {
              appName: "celonis",
              connectionId: "connection-id",
            } as unknown as object,
            metadata: null,
          },
        ],
      },
      {
        packageKey: "key-2",
        version: "1.0.0",
        variables: [
          {
            key: "key2-var",
            type: PackageManagerVariableType.DATA_MODEL,
            value: "dm-id" as unknown as object,
            metadata: {},
          },
          {
            key: "key-2-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: "connection-id",
            metadata: {
              appName: "nameOfApp",
            },
          },
        ],
      },
    ];

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      [...exportedVariables],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`,
      { ...firstPackageNode, spaceId: "space-1" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${secondPackageNode.key}/${secondPackageNode.key}`,
      { ...secondPackageNode, spaceId: "space-2" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      ["key-1", "key-2"],
      undefined,
      true,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const actualZip = new AdmZip(fileBuffer);

    const exportedVariablesFileContent: VariableManifestTransport[] = parse(
      actualZip
        .getEntry(BatchExportImportConstants.VARIABLES_FILE_NAME)
        .getData()
        .toString(),
    );
    expect(exportedVariablesFileContent).toHaveLength(2);
    expect(exportedVariablesFileContent).toContainEqual({
      packageKey: "key-1",
      version: "1.0.0",
      variables: [
        {
          key: "key1-var",
          type: PackageManagerVariableType.DATA_MODEL,
          value: "dm-id",
          metadata: {},
        },
        {
          key: "key-1-connection",
          type: PackageManagerVariableType.CONNECTION,
          value: {
            appName: "celonis",
            connectionId: "connection-id",
          },
          metadata: {
            appName: "celonis",
          },
        },
      ],
    });
    expect(exportedVariablesFileContent).toContainEqual({
      packageKey: "key-2",
      version: "1.0.0",
      variables: [
        {
          key: "key2-var",
          type: PackageManagerVariableType.DATA_MODEL,
          value: "dm-id",
          metadata: {},
        },
        {
          key: "key-2-connection",
          type: PackageManagerVariableType.CONNECTION,
          value: "connection-id",
          metadata: {
            appName: "nameOfApp",
          },
        },
      ],
    });

    const variableExportRequest = parse(
      mockedPostRequestBodyByUrl.get(
        "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      ),
    );
    expect(variableExportRequest).toBeTruthy();
    expect(variableExportRequest).toHaveLength(3);
    expect(variableExportRequest).toContainEqual({
      packageKey: "key-1",
      version: "1.0.0",
    });
    expect(variableExportRequest).toContainEqual({
      packageKey: "key-2",
      version: "1.0.0",
    });
    expect(variableExportRequest).toContainEqual({
      packageKey: "key-2",
      version: "1.1.1",
    });
  });

  it("Should export variables file with handled null connection variables", async () => {
    const firstPackageDependencies = new Map<string, DependencyTransport[]>();
    firstPackageDependencies.set("1.0.0", []);

    const secondPackageDependencies = new Map<string, DependencyTransport[]>();
    secondPackageDependencies.set("1.0.0", []);
    secondPackageDependencies.set("1.1.1", []);

    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-1",
        BatchExportImportConstants.STUDIO,
        firstPackageDependencies,
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-2",
        BatchExportImportConstants.STUDIO,
        secondPackageDependencies,
      ),
    );

    const firstPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key1-var",
        type: PackageManagerVariableType.DATA_MODEL,
        runtime: false,
      },
      {
        key: "key-1-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const firstPackageNode = ConfigUtils.buildPackageNode("key-1", {
      variables: firstPackageVariableDefinition,
    });
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [],
      "1.0.0",
    );

    const secondPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key2-var",
        type: PackageManagerVariableType.DATA_MODEL,
        runtime: false,
      },
      {
        key: "key-2-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const secondPackageNode = ConfigUtils.buildPackageNode("key-2", {
      variables: secondPackageVariableDefinition,
    });
    const secondPackageZip = ConfigUtils.buildExportPackageZip(
      secondPackageNode,
      [],
      "1.0.0",
    );

    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
      secondPackageZip,
    ]);

    const exportedVariables: VariableManifestTransport[] = [
      {
        packageKey: "key-1",
        version: "1.0.0",
        variables: [
          {
            key: "key1-var",
            type: PackageManagerVariableType.DATA_MODEL,
            value: "dm-id" as unknown as object,
            metadata: {},
          },
          {
            key: "key-1-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: null,
            metadata: null,
          },
        ],
      },
      {
        packageKey: "key-2",
        version: "1.0.0",
        variables: [
          {
            key: "key2-var",
            type: PackageManagerVariableType.DATA_MODEL,
            value: "dm-id" as unknown as object,
            metadata: {},
          },
          {
            key: "key-2-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: null,
            metadata: null,
          },
        ],
      },
    ];

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      [...exportedVariables],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`,
      { ...firstPackageNode, spaceId: "space-1" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${secondPackageNode.key}/${secondPackageNode.key}`,
      { ...secondPackageNode, spaceId: "space-2" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      ["key-1", "key-2"],
      undefined,
      true,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const actualZip = new AdmZip(fileBuffer);

    const exportedVariablesFileContent: VariableManifestTransport[] = parse(
      actualZip
        .getEntry(BatchExportImportConstants.VARIABLES_FILE_NAME)
        .getData()
        .toString(),
    );
    expect(exportedVariablesFileContent).toHaveLength(2);
    expect(exportedVariablesFileContent).toContainEqual({
      packageKey: "key-1",
      version: "1.0.0",
      variables: [
        {
          key: "key1-var",
          type: PackageManagerVariableType.DATA_MODEL,
          value: "dm-id",
          metadata: {},
        },
        {
          key: "key-1-connection",
          type: PackageManagerVariableType.CONNECTION,
          value: null,
          metadata: null,
        },
      ],
    });
    expect(exportedVariablesFileContent).toContainEqual({
      packageKey: "key-2",
      version: "1.0.0",
      variables: [
        {
          key: "key2-var",
          type: PackageManagerVariableType.DATA_MODEL,
          value: "dm-id",
          metadata: {},
        },
        {
          key: "key-2-connection",
          type: PackageManagerVariableType.CONNECTION,
          value: null,
          metadata: null,
        },
      ],
    });

    const variableExportRequest = parse(
      mockedPostRequestBodyByUrl.get(
        "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      ),
    );
    expect(variableExportRequest).toBeTruthy();
    expect(variableExportRequest).toHaveLength(3);
    expect(variableExportRequest).toContainEqual({
      packageKey: "key-1",
      version: "1.0.0",
    });
    expect(variableExportRequest).toContainEqual({
      packageKey: "key-2",
      version: "1.0.0",
    });
    expect(variableExportRequest).toContainEqual({
      packageKey: "key-2",
      version: "1.1.1",
    });
  });

  it("Should export variables file with connection variables fixed when package keys are sent with versions", async () => {
    const firstPackageDependencies = new Map<string, DependencyTransport[]>();
    firstPackageDependencies.set("1.0.2", []);

    const secondPackageDependencies = new Map<string, DependencyTransport[]>();
    secondPackageDependencies.set("1.0.3", []);

    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key-1",
        BatchExportImportConstants.STUDIO,
        "1.0.2",
        firstPackageDependencies,
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key-2",
        BatchExportImportConstants.STUDIO,
        "1.0.3",
        secondPackageDependencies,
      ),
    );

    const firstPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key1-var",
        type: PackageManagerVariableType.DATA_MODEL,
        runtime: false,
      },
      {
        key: "key-1-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const firstPackageNode = ConfigUtils.buildPackageNode("key-1", {
      variables: firstPackageVariableDefinition,
    });
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [],
      "1.0.2",
    );

    const secondPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key2-var",
        type: PackageManagerVariableType.DATA_MODEL,
        runtime: false,
      },
      {
        key: "key-2-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const secondPackageNode = ConfigUtils.buildPackageNode("key-2", {
      variables: secondPackageVariableDefinition,
    });
    const secondPackageZip = ConfigUtils.buildExportPackageZip(
      secondPackageNode,
      [],
      "1.0.3",
    );

    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
      secondPackageZip,
    ]);

    const exportedVariables: VariableManifestTransport[] = [
      {
        packageKey: "key-1",
        version: "1.0.2",
        variables: [
          {
            key: "key1-var",
            type: PackageManagerVariableType.DATA_MODEL,
            value: "dm-id" as unknown as object,
            metadata: {},
          },
          {
            key: "key-1-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: {
              appName: "celonis",
              connectionId: "connection-id",
            } as unknown as object,
            metadata: null,
          },
        ],
      },
      {
        packageKey: "key-2",
        version: "1.0.3",
        variables: [
          {
            key: "key2-var",
            type: PackageManagerVariableType.DATA_MODEL,
            value: "dm-id" as unknown as object,
            metadata: {},
          },
          {
            key: "key-2-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: "connection-id",
            metadata: {
              appName: "nameOfApp",
            },
          },
        ],
      },
    ];

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/versions/export/batch?packageKeysWithVersion=key-1.1.0.2&packageKeysWithVersion=key-2.1.0.3&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      [...exportedVariables],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`,
      { ...firstPackageNode, spaceId: "space-1" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${secondPackageNode.key}/${secondPackageNode.key}`,
      { ...secondPackageNode, spaceId: "space-2" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      undefined,
      ["key-1.1.0.2", "key-2.1.0.3"],
      true,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const actualZip = new AdmZip(fileBuffer);

    const exportedVariablesFileContent: VariableManifestTransport[] = parse(
      actualZip
        .getEntry(BatchExportImportConstants.VARIABLES_FILE_NAME)
        .getData()
        .toString(),
    );
    expect(exportedVariablesFileContent).toHaveLength(2);
    expect(exportedVariablesFileContent).toContainEqual({
      packageKey: "key-1",
      version: "1.0.2",
      variables: [
        {
          key: "key1-var",
          type: PackageManagerVariableType.DATA_MODEL,
          value: "dm-id",
          metadata: {},
        },
        {
          key: "key-1-connection",
          type: PackageManagerVariableType.CONNECTION,
          value: {
            appName: "celonis",
            connectionId: "connection-id",
          },
          metadata: {
            appName: "celonis",
          },
        },
      ],
    });
    expect(exportedVariablesFileContent).toContainEqual({
      packageKey: "key-2",
      version: "1.0.3",
      variables: [
        {
          key: "key2-var",
          type: PackageManagerVariableType.DATA_MODEL,
          value: "dm-id",
          metadata: {},
        },
        {
          key: "key-2-connection",
          type: PackageManagerVariableType.CONNECTION,
          value: "connection-id",
          metadata: {
            appName: "nameOfApp",
          },
        },
      ],
    });

    const variableExportRequest = parse(
      mockedPostRequestBodyByUrl.get(
        "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      ),
    );
    expect(variableExportRequest).toBeTruthy();
    expect(variableExportRequest).toHaveLength(2);
    expect(variableExportRequest).toContainEqual({
      packageKey: "key-1",
      version: "1.0.2",
    });
    expect(variableExportRequest).toContainEqual({
      packageKey: "key-2",
      version: "1.0.3",
    });
  });

  it("Should remove SCENARIO asset files of packages", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-1",
        BatchExportImportConstants.STUDIO,
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-2",
        BatchExportImportConstants.STUDIO,
      ),
    );

    const firstPackageNode = ConfigUtils.buildPackageNode("key-1", {});
    const firstPackageScenarioChild = ConfigUtils.buildChildNode(
      "child-1-scenario",
      firstPackageNode.key,
      "SCENARIO",
    );
    const firstPackageTestChild = ConfigUtils.buildChildNode(
      "child-2",
      firstPackageNode.key,
      "TEST",
    );
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [firstPackageScenarioChild, firstPackageTestChild],
      "1.0.0",
    );

    const secondPackageNode = ConfigUtils.buildPackageNode("key-2", {});
    const secondPackageScenarioChild = ConfigUtils.buildChildNode(
      "child-3-scenario",
      secondPackageNode.key,
      "SCENARIO",
    );
    const secondPackageTestChild = ConfigUtils.buildChildNode(
      "child-4",
      secondPackageNode.key,
      "TEST",
    );
    const secondPackageZip = ConfigUtils.buildExportPackageZip(
      secondPackageNode,
      [secondPackageScenarioChild, secondPackageTestChild],
      "1.0.0",
    );

    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
      secondPackageZip,
    ]);

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`,
      { ...firstPackageNode, spaceId: "space-1" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${secondPackageNode.key}/${secondPackageNode.key}`,
      { ...secondPackageNode, spaceId: "space-2" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      ["key-1", "key-2"],
      undefined,
      true,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const actualZip = new AdmZip(fileBuffer);

    const firstPackageExportedZip = new AdmZip(
      actualZip.getEntry("key-1_1.0.0.zip").getData(),
    );
    expect(
      firstPackageExportedZip.getEntry("nodes/child-1-scenario.json"),
    ).toBeNull();
    expect(
      firstPackageExportedZip
        .getEntry("nodes/child-2.json")
        .getData()
        .toString(),
    ).toEqual(stringify(firstPackageTestChild));

    const secondPackageExportedZip = new AdmZip(
      actualZip.getEntry("key-2_1.0.0.zip").getData(),
    );
    expect(
      secondPackageExportedZip.getEntry("nodes/child-3-scenario.json"),
    ).toBeNull();
    expect(
      secondPackageExportedZip
        .getEntry("nodes/child-4.json")
        .getData()
        .toString(),
    ).toEqual(stringify(secondPackageTestChild));
  });

  it("Should remove SCENARIO asset files of package keys that are sent with versions", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key-1",
        BatchExportImportConstants.STUDIO,
        "1.0.2",
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key-2",
        BatchExportImportConstants.STUDIO,
        "1.0.3",
      ),
    );

    const firstPackageNode = ConfigUtils.buildPackageNode("key-1", {});
    const firstPackageScenarioChild = ConfigUtils.buildChildNode(
      "child-1-scenario",
      firstPackageNode.key,
      "SCENARIO",
    );
    const firstPackageTestChild = ConfigUtils.buildChildNode(
      "child-2",
      firstPackageNode.key,
      "TEST",
    );
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [firstPackageScenarioChild, firstPackageTestChild],
      "1.0.2",
    );

    const secondPackageNode = ConfigUtils.buildPackageNode("key-2", {});
    const secondPackageScenarioChild = ConfigUtils.buildChildNode(
      "child-3-scenario",
      secondPackageNode.key,
      "SCENARIO",
    );
    const secondPackageTestChild = ConfigUtils.buildChildNode(
      "child-4",
      secondPackageNode.key,
      "TEST",
    );
    const secondPackageZip = ConfigUtils.buildExportPackageZip(
      secondPackageNode,
      [secondPackageScenarioChild, secondPackageTestChild],
      "1.0.3",
    );

    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
      secondPackageZip,
    ]);

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/versions/export/batch?packageKeysWithVersion=key-1.1.0.2&packageKeysWithVersion=key-2.1.0.3&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`,
      { ...firstPackageNode, spaceId: "space-1" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${secondPackageNode.key}/${secondPackageNode.key}`,
      { ...secondPackageNode, spaceId: "space-2" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      undefined,
      ["key-1.1.0.2", "key-2.1.0.3"],
      true,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const actualZip = new AdmZip(fileBuffer);

    const firstPackageExportedZip = new AdmZip(
      actualZip.getEntry("key-1_1.0.2.zip").getData(),
    );
    expect(
      firstPackageExportedZip.getEntry("nodes/child-1-scenario.json"),
    ).toBeNull();
    expect(
      firstPackageExportedZip
        .getEntry("nodes/child-2.json")
        .getData()
        .toString(),
    ).toEqual(stringify(firstPackageTestChild));

    const secondPackageExportedZip = new AdmZip(
      actualZip.getEntry("key-2_1.0.3.zip").getData(),
    );
    expect(
      secondPackageExportedZip.getEntry("nodes/child-3-scenario.json"),
    ).toBeNull();
    expect(
      secondPackageExportedZip
        .getEntry("nodes/child-4.json")
        .getData()
        .toString(),
    ).toEqual(stringify(secondPackageTestChild));
  });

  it("Should add appName to metadata for CONNECTION variables of package.json files", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-1",
        BatchExportImportConstants.STUDIO,
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key-2",
        BatchExportImportConstants.STUDIO,
      ),
    );

    const firstPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key1-var",
        type: PackageManagerVariableType.DATA_MODEL,
        runtime: false,
      },
      {
        key: "key-1-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const firstPackageNode = ConfigUtils.buildPackageNode("key-1", {
      variables: firstPackageVariableDefinition,
    });
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [],
      "1.0.0",
    );

    const secondPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key2-var",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
        metadata: {
          appName: "celonis",
        },
      },
      {
        key: "key-2-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const secondPackageNode = ConfigUtils.buildPackageNode("key-2", {
      variables: secondPackageVariableDefinition,
    });
    const secondPackageZip = ConfigUtils.buildExportPackageZip(
      secondPackageNode,
      [],
      "1.0.0",
    );

    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
      secondPackageZip,
    ]);

    const exportedVariables: VariableManifestTransport[] = [
      {
        packageKey: "key-1",
        version: "1.0.0",
        variables: [
          {
            key: "key1-var",
            type: PackageManagerVariableType.DATA_MODEL,
            value: "dm-id" as unknown as object,
            metadata: {},
          },
          {
            key: "key-1-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: {
              appName: "celonis",
              connectionId: "connection-id",
            } as unknown as object,
            metadata: null,
          },
        ],
      },
      {
        packageKey: "key-2",
        version: "1.0.0",
        variables: [
          {
            key: "key2-var",
            type: PackageManagerVariableType.CONNECTION,
            value: {
              appName: "celonis",
              connectionId: "connection-id",
            } as unknown as object,
            metadata: {
              appName: "celonis",
            },
          },
          {
            key: "key-2-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: "connection-id",
            metadata: {
              appName: "nameOfApp",
            },
          },
        ],
      },
    ];

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      exportedVariables,
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`,
      { ...firstPackageNode, spaceId: "space-1" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${secondPackageNode.key}/${secondPackageNode.key}`,
      { ...secondPackageNode, spaceId: "space-2" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      ["key-1", "key-2"],
      undefined,
      true,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const actualZip = new AdmZip(fileBuffer);

    const firstPackageExportedZip = new AdmZip(
      actualZip.getEntry("key-1_1.0.0.zip").getData(),
    );
    const firstPackageExportedNode: NodeExportTransport = parse(
      firstPackageExportedZip.getEntry("package.json").getData().toString(),
    );
    expect(firstPackageExportedNode).toBeTruthy();
    const firstPackageContent: NodeConfiguration =
      firstPackageExportedNode.configuration;
    expect(firstPackageContent.variables).toHaveLength(2);
    expect(firstPackageContent.variables).toEqual([
      {
        ...firstPackageVariableDefinition[0],
      },
      {
        ...firstPackageVariableDefinition[1],
        metadata: {
          appName: "celonis",
        },
      },
    ]);

    const secondPackageExportedZip = new AdmZip(
      actualZip.getEntry("key-2_1.0.0.zip").getData(),
    );
    const secondPackageExportedNode: NodeExportTransport = parse(
      secondPackageExportedZip.getEntry("package.json").getData().toString(),
    );
    expect(secondPackageExportedNode).toBeTruthy();
    const secondPackageContent: NodeConfiguration =
      secondPackageExportedNode.configuration;
    expect(secondPackageContent.variables).toHaveLength(2);
    expect(secondPackageContent.variables).toEqual([
      {
        ...secondPackageVariableDefinition[0],
      },
      {
        ...secondPackageVariableDefinition[1],
        metadata: {
          appName: "nameOfApp",
        },
      },
    ]);
  });

  it("Should add appName to metadata for CONNECTION variables of package.json files when package keys are sent with versions", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key-1",
        BatchExportImportConstants.STUDIO,
        "1.0.4",
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key-2",
        BatchExportImportConstants.STUDIO,
        "1.0.5",
      ),
    );

    const firstPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key1-var",
        type: PackageManagerVariableType.DATA_MODEL,
        runtime: false,
      },
      {
        key: "key-1-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const firstPackageNode = ConfigUtils.buildPackageNode("key-1", {
      variables: firstPackageVariableDefinition,
    });
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [],
      "1.0.4",
    );

    const secondPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key2-var",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
        metadata: {
          appName: "celonis",
        },
      },
      {
        key: "key-2-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const secondPackageNode = ConfigUtils.buildPackageNode("key-2", {
      variables: secondPackageVariableDefinition,
    });
    const secondPackageZip = ConfigUtils.buildExportPackageZip(
      secondPackageNode,
      [],
      "1.0.5",
    );

    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
      secondPackageZip,
    ]);

    const exportedVariables: VariableManifestTransport[] = [
      {
        packageKey: "key-1",
        version: "1.0.4",
        variables: [
          {
            key: "key1-var",
            type: PackageManagerVariableType.DATA_MODEL,
            value: "dm-id" as unknown as object,
            metadata: {},
          },
          {
            key: "key-1-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: {
              appName: "celonis",
              connectionId: "connection-id",
            } as unknown as object,
            metadata: null,
          },
        ],
      },
      {
        packageKey: "key-2",
        version: "1.0.5",
        variables: [
          {
            key: "key2-var",
            type: PackageManagerVariableType.CONNECTION,
            value: {
              appName: "celonis",
              connectionId: "connection-id",
            } as unknown as object,
            metadata: {
              appName: "celonis",
            },
          },
          {
            key: "key-2-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: "connection-id",
            metadata: {
              appName: "nameOfApp",
            },
          },
        ],
      },
    ];

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/versions/export/batch?packageKeysWithVersion=key-1.1.0.4&packageKeysWithVersion=key-2.1.0.5&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      exportedVariables,
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`,
      { ...firstPackageNode, spaceId: "space-1" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${secondPackageNode.key}/${secondPackageNode.key}`,
      { ...secondPackageNode, spaceId: "space-2" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      undefined,
      ["key-1.1.0.4", "key-2.1.0.5"],
      true,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const actualZip = new AdmZip(fileBuffer);

    const firstPackageExportedZip = new AdmZip(
      actualZip.getEntry("key-1_1.0.4.zip").getData(),
    );
    const firstPackageExportedNode: NodeExportTransport = parse(
      firstPackageExportedZip.getEntry("package.json").getData().toString(),
    );
    expect(firstPackageExportedNode).toBeTruthy();
    const firstPackageContent: NodeConfiguration =
      firstPackageExportedNode.configuration;
    expect(firstPackageContent.variables).toHaveLength(2);
    expect(firstPackageContent.variables).toEqual([
      {
        ...firstPackageVariableDefinition[0],
      },
      {
        ...firstPackageVariableDefinition[1],
        metadata: {
          appName: "celonis",
        },
      },
    ]);

    const secondPackageExportedZip = new AdmZip(
      actualZip.getEntry("key-2_1.0.5.zip").getData(),
    );
    const secondPackageExportedNode: NodeExportTransport = parse(
      secondPackageExportedZip.getEntry("package.json").getData().toString(),
    );
    expect(secondPackageExportedNode).toBeTruthy();
    const secondPackageContent: NodeConfiguration =
      secondPackageExportedNode.configuration;
    expect(secondPackageContent.variables).toHaveLength(2);
    expect(secondPackageContent.variables).toEqual([
      {
        ...secondPackageVariableDefinition[0],
      },
      {
        ...secondPackageVariableDefinition[1],
        metadata: {
          appName: "nameOfApp",
        },
      },
    ]);
  });

  it("Should export with SCENARIO nodes removed and CONNECTION variables fixed for package key with multiple underscores", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavor(
        "key_with_underscores_1",
        BatchExportImportConstants.STUDIO,
      ),
    );

    const firstPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key1-var",
        type: PackageManagerVariableType.DATA_MODEL,
        runtime: false,
      },
      {
        key: "key-1-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
      {
        key: "key-1-another-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const firstPackageNode = ConfigUtils.buildPackageNode(
      "key_with_underscores_1",
      {
        variables: firstPackageVariableDefinition,
      },
    );
    const firstPackageScenarioChild = ConfigUtils.buildChildNode(
      "child-1-scenario",
      firstPackageNode.key,
      "SCENARIO",
    );
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [firstPackageScenarioChild],
      "1.0.0",
    );

    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
    ]);

    const exportedVariables: VariableManifestTransport[] = [
      {
        packageKey: "key_with_underscores_1",
        version: "1.0.0",
        variables: [
          {
            key: "key1-var",
            type: PackageManagerVariableType.DATA_MODEL,
            value: "dm-id" as unknown as object,
            metadata: {},
          },
          {
            key: "key-1-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: {
              appName: "celonis",
              connectionId: "connection-id",
            } as unknown as object,
            metadata: null,
          },
          {
            key: "key-1-another-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: "connection-id",
            metadata: {
              appName: "nameOfApp",
            },
          },
        ],
      },
    ];

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key_with_underscores_1&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      exportedVariables,
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`,
      { ...firstPackageNode, spaceId: "space-1" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      ["key_with_underscores_1"],
      undefined,
      true,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const actualZip = new AdmZip(fileBuffer);

    const firstPackageExportedZip = new AdmZip(
      actualZip.getEntry("key_with_underscores_1_1.0.0.zip").getData(),
    );
    const firstPackageExportedNode: NodeExportTransport = parse(
      firstPackageExportedZip.getEntry("package.json").getData().toString(),
    );
    expect(firstPackageExportedNode).toBeTruthy();
    const firstPackageContent: NodeConfiguration =
      firstPackageExportedNode.configuration;
    expect(firstPackageContent.variables).toHaveLength(3);
    expect(firstPackageContent.variables).toEqual([
      {
        ...firstPackageVariableDefinition[0],
      },
      {
        ...firstPackageVariableDefinition[1],
        metadata: {
          appName: "celonis",
        },
      },
      {
        ...firstPackageVariableDefinition[2],
        metadata: {
          appName: "nameOfApp",
        },
      },
    ]);

    expect(
      firstPackageExportedZip.getEntry("nodes/child-1-scenario.json"),
    ).toBeNull();
  });

  it("Should export with SCENARIO nodes removed and CONNECTION variables fixed for package key with multiple underscores and version", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key_with_underscores_1",
        BatchExportImportConstants.STUDIO,
        "1.0.6",
      ),
    );

    const firstPackageVariableDefinition: VariableDefinition[] = [
      {
        key: "key1-var",
        type: PackageManagerVariableType.DATA_MODEL,
        runtime: false,
      },
      {
        key: "key-1-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
      {
        key: "key-1-another-connection",
        type: PackageManagerVariableType.CONNECTION,
        runtime: false,
      },
    ];

    const firstPackageNode = ConfigUtils.buildPackageNode(
      "key_with_underscores_1",
      {
        variables: firstPackageVariableDefinition,
      },
    );
    const firstPackageScenarioChild = ConfigUtils.buildChildNode(
      "child-1-scenario",
      firstPackageNode.key,
      "SCENARIO",
    );
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [firstPackageScenarioChild],
      "1.0.6",
    );

    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [
      firstPackageZip,
    ]);

    const exportedVariables: VariableManifestTransport[] = [
      {
        packageKey: "key_with_underscores_1",
        version: "1.0.6",
        variables: [
          {
            key: "key1-var",
            type: PackageManagerVariableType.DATA_MODEL,
            value: "dm-id" as unknown as object,
            metadata: {},
          },
          {
            key: "key-1-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: {
              appName: "celonis",
              connectionId: "connection-id",
            } as unknown as object,
            metadata: null,
          },
          {
            key: "key-1-another-connection",
            type: PackageManagerVariableType.CONNECTION,
            value: "connection-id",
            metadata: {
              appName: "nameOfApp",
            },
          },
        ],
      },
    ];

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/versions/export/batch?packageKeysWithVersion=key_with_underscores_1.1.0.6&withDependencies=true",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      exportedVariables,
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`,
      { ...firstPackageNode, spaceId: "space-1" },
    );
    mockAxiosGet(
      `https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values?appMode=VIEWER`,
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      undefined,
      ["key_with_underscores_1.1.0.6"],
      true,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const actualZip = new AdmZip(fileBuffer);

    const firstPackageExportedZip = new AdmZip(
      actualZip.getEntry("key_with_underscores_1_1.0.6.zip").getData(),
    );
    const firstPackageExportedNode: NodeExportTransport = parse(
      firstPackageExportedZip.getEntry("package.json").getData().toString(),
    );
    expect(firstPackageExportedNode).toBeTruthy();
    const firstPackageContent: NodeConfiguration =
      firstPackageExportedNode.configuration;
    expect(firstPackageContent.variables).toHaveLength(3);
    expect(firstPackageContent.variables).toEqual([
      {
        ...firstPackageVariableDefinition[0],
      },
      {
        ...firstPackageVariableDefinition[1],
        metadata: {
          appName: "celonis",
        },
      },
      {
        ...firstPackageVariableDefinition[2],
        metadata: {
          appName: "nameOfApp",
        },
      },
    ]);

    expect(
      firstPackageExportedZip.getEntry("nodes/child-1-scenario.json"),
    ).toBeNull();
  });

  it("Should export by packageKeys without dependencies", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", "TEST"));
    manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "TEST"));
    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&packageKeys=key-3&withDependencies=false",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      ["key-1", "key-2", "key-3"],
      undefined,
      false,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();
  });

  it("Should export by packageKeys without dependencies when packages are sent with keys and versions", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key-1",
        "TEST",
        "1.0.3",
      ),
    );
    manifest.push(
      ConfigUtils.buildManifestForKeyAndFlavorAndVersion(
        "key-2",
        "TEST",
        "1.0.4",
      ),
    );
    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);

    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/versions/export/batch?packageKeysWithVersion=key-1.1.0.3&packageKeysWithVersion=key-2.1.0.4&packageKeysWithVersion=key-3.1.0.5&withDependencies=false",
      exportedPackagesZip.toBuffer(),
    );
    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments",
      [],
    );

    await new ConfigCommandService(testContext).batchExportPackages(
      undefined,
      ["key-1.1.0.3", "key-2.1.0.4", "key-3.1.0.5"],
      false,
      null,
      null,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();
  });
});
