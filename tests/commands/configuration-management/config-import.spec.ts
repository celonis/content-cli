import * as path from "path";
import {
  mockCreateReadStream,
  mockExistsSync,
  mockReadDirSync,
  mockReadFileSync,
} from "../../utls/fs-mock-utils";
import {
  PackageManifestTransport,
  PostPackageImportData,
  StudioPackageManifest,
} from "../../../src/commands/configuration-management/interfaces/package-export.interfaces";
import {
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosPut,
  mockedAxiosInstance,
  mockedPostRequestBodyByUrl,
} from "../../utls/http-requests-mock";
import { ConfigCommandService } from "../../../src/commands/configuration-management/config-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { SpaceTransport } from "../../../src/commands/studio/interfaces/space.interface";
import {
  ContentNodeTransport,
  PackageManagerVariableType,
  VariablesAssignments,
} from "../../../src/commands/studio/interfaces/package-manager.interfaces";
import { BatchExportImportConstants } from "../../../src/commands/configuration-management/interfaces/batch-export-import.constants";
import { ConfigUtils } from "../../utls/config-utils";
import { stringify } from "../../../src/core/utils/json";
import { GitService } from "../../../src/core/git-profile/git/git.service";
import { FileService } from "../../../src/core/utils/file-service";

describe("Config import", () => {
  const LOG_MESSAGE: string = "Config import report file: ";

  beforeEach(() => {
    mockExistsSync();
  });

  it.each([true, false])(
    "Should batch import package configs with overwrite %p",
    async (overwrite: boolean) => {
      const manifest: PackageManifestTransport[] = [];
      manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", "TEST"));
      const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);

      mockReadFileSync(exportedPackagesZip.toBuffer());
      mockCreateReadStream(exportedPackagesZip.toBuffer());
      mockAxiosGet(
        "https://myTeam.celonis.cloud/package-manager/api/packages",
        [],
      );

      const importResponse: PostPackageImportData[] = [
        {
          packageKey: "key-1",
          importedVersions: [
            {
              oldVersion: "1.0.2",
              newVersion: "1.0.0",
            },
          ],
        },
      ];

      mockAxiosPost(
        "https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch",
        importResponse,
      );

      await new ConfigCommandService(testContext).batchImportPackages(
        "./export_file.zip",
        null,
        overwrite,
        null,
      );

      const expectedFileName =
        loggingTestTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.resolve(process.cwd(), expectedFileName),
        JSON.stringify(importResponse),
        { encoding: "utf-8" },
      );
    },
  );

  it.each([true, false])(
    "Should batch import package configs from git branch with overwrite %p, when the branch is specified and" +
      " branch contains zipped directory",
    async (overwrite: boolean) => {
      const branchName = "my-branch";
      const manifest: PackageManifestTransport[] = [];
      manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", "TEST"));
      const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);

      jest
        .spyOn(GitService.prototype, "pullFromBranch")
        .mockResolvedValue("mocked-pulled-git-path");
      mockReadFileSync(exportedPackagesZip.toBuffer());
      mockCreateReadStream(exportedPackagesZip.toBuffer());
      mockAxiosGet(
        "https://myTeam.celonis.cloud/package-manager/api/packages",
        [],
      );

      const importResponse: PostPackageImportData[] = [
        {
          packageKey: "key-1",
          importedVersions: [
            {
              oldVersion: "1.0.2",
              newVersion: "1.0.0",
            },
          ],
        },
      ];

      mockAxiosPost(
        "https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch",
        importResponse,
      );

      await new ConfigCommandService(testContext).batchImportPackages(
        null,
        null,
        overwrite,
        branchName,
      );

      const expectedFileName =
        loggingTestTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.resolve(process.cwd(), expectedFileName),
        JSON.stringify(importResponse),
        { encoding: "utf-8" },
      );
    },
  );

  it.each([true, false])(
    "Should batch import package configs from git branch with overwrite %p, when the branch is specified and" +
      " branch contains non-zipped directory",
    async (overwrite: boolean) => {
      const branchName = "my-branch";
      const manifest: PackageManifestTransport[] = [];
      manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", "TEST"));

      const returnedGitPath = "mocked-pulled-git-path";
      jest
        .spyOn(GitService.prototype, "pullFromBranch")
        .mockResolvedValue(returnedGitPath);

      jest
        .spyOn(FileService.prototype, "zipDirectoryInBatchExportFormat")
        .mockReturnValue("export_file.zip");
      const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);

      mockReadFileSync(exportedPackagesZip.toBuffer());
      mockCreateReadStream(exportedPackagesZip.toBuffer());
      mockReadDirSync(["manifest.json", "variables.json"]);
      mockAxiosGet(
        "https://myTeam.celonis.cloud/package-manager/api/packages",
        [],
      );

      const importResponse: PostPackageImportData[] = [
        {
          packageKey: "key-1",
          importedVersions: [
            {
              oldVersion: "1.0.2",
              newVersion: "1.0.0",
            },
          ],
        },
      ];

      mockAxiosPost(
        "https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch",
        importResponse,
      );

      await new ConfigCommandService(testContext).batchImportPackages(
        null,
        null,
        overwrite,
        branchName,
      );

      const expectedFileName =
        loggingTestTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.resolve(process.cwd(), expectedFileName),
        JSON.stringify(importResponse),
        { encoding: "utf-8" },
      );
    },
  );

  it("Should batch import configs & map space ID as specified in manifest file for Studio Packages", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "STUDIO"));

    const studioManifest: StudioPackageManifest[] = [];
    studioManifest.push(
      ConfigUtils.buildStudioManifestForKeyWithSpace(
        "key-2",
        "spaceName",
        "space-id",
      ),
    );

    const firstPackageNode = ConfigUtils.buildPackageNode("key-2", {
      variables: [],
    });
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [],
      "1.0.0",
    );
    const exportedPackagesZip =
      ConfigUtils.buildBatchExportZipWithStudioManifest(
        manifest,
        studioManifest,
        [firstPackageZip],
      );

    const space: SpaceTransport = {
      id: "space-id",
      name: "space",
      iconReference: "earth",
    };

    const otherSpace: SpaceTransport = {
      id: "spaceId",
      name: "spaceName",
      iconReference: "earth",
    };

    mockReadFileSync(exportedPackagesZip.toBuffer());
    mockCreateReadStream(exportedPackagesZip.toBuffer());
    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/packages",
      [],
    );
    mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [
      space,
      otherSpace,
    ]);

    const importResponse: PostPackageImportData[] = [
      {
        packageKey: "key-1",
        importedVersions: [
          {
            oldVersion: "1.0.2",
            newVersion: "1.0.0",
          },
        ],
      },
    ];

    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch",
      importResponse,
    );

    await new ConfigCommandService(testContext).batchImportPackages(
      "./export_file.zip",
      null,
      true,
      null,
    );

    const expectedFileName =
      loggingTestTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      JSON.stringify(importResponse),
      { encoding: "utf-8" },
    );
  });

  it("Should fail to map space ID as the space id specified in manifest file cannot be found", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "STUDIO"));

    const studioManifest: StudioPackageManifest[] = [];
    studioManifest.push(
      ConfigUtils.buildStudioManifestForKeyWithSpace(
        "key-2",
        "spaceName",
        "space",
      ),
    );

    const firstPackageNode = ConfigUtils.buildPackageNode("key-2", {
      variables: [],
    });
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [],
      "1.0.0",
    );
    const exportedPackagesZip =
      ConfigUtils.buildBatchExportZipWithStudioManifest(
        manifest,
        studioManifest,
        [firstPackageZip],
      );

    const space: SpaceTransport = {
      id: "space-id",
      name: "space",
      iconReference: "earth",
    };

    mockReadFileSync(exportedPackagesZip.toBuffer());
    mockCreateReadStream(exportedPackagesZip.toBuffer());
    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/packages",
      [],
    );
    mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [
      space,
    ]);

    await expect(
      new ConfigCommandService(testContext).batchImportPackages(
        "./export_file.zip",
        null,
        true,
        null,
      ),
    ).rejects.toThrow("Provided space ID does not exist.");
  });

  it("Should batch import configs & map space ID as specified in manifest file for Studio Packages & move to space for existing packages.", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "STUDIO"));

    const studioManifest: StudioPackageManifest[] = [];
    studioManifest.push(
      ConfigUtils.buildStudioManifestForKeyWithSpace(
        "key-2",
        "space",
        "spaceId",
      ),
    );

    const firstPackageNode = ConfigUtils.buildPackageNode("key-2", {
      variables: [],
    });
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [],
      "1.0.0",
    );
    const exportedPackagesZip =
      ConfigUtils.buildBatchExportZipWithStudioManifest(
        manifest,
        studioManifest,
        [firstPackageZip],
      );

    const existingNode: Partial<ContentNodeTransport> = {
      id: "node-id",
      key: "key-2",
    };

    const space: SpaceTransport = {
      id: "spaceId",
      name: "space",
      iconReference: "earth",
    };

    mockReadFileSync(exportedPackagesZip.toBuffer());
    mockCreateReadStream(exportedPackagesZip.toBuffer());
    mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages", [
      existingNode,
    ]);
    mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [
      space,
    ]);
    mockAxiosPut(
      "https://myTeam.celonis.cloud/package-manager/api/packages/node-id/move/spaceId",
      {},
    );

    const importResponse: PostPackageImportData[] = [
      {
        packageKey: "key-1",
        importedVersions: [
          {
            oldVersion: "1.0.2",
            newVersion: "1.0.0",
          },
        ],
      },
    ];

    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch",
      importResponse,
    );

    await new ConfigCommandService(testContext).batchImportPackages(
      "./export_file.zip",
      null,
      true,
      null,
    );
    const expectedFileName =
      loggingTestTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      JSON.stringify(importResponse),
      { encoding: "utf-8" },
    );
    expect(mockedAxiosInstance.put).toHaveBeenCalledWith(
      "https://myTeam.celonis.cloud/package-manager/api/packages/node-id/move/spaceId",
      expect.anything(),
      expect.anything(),
    );
  });

  it("Should batch import configs & map space ID by finding space with name as specified in manifest file", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "STUDIO"));

    const studioManifest: StudioPackageManifest[] = [];
    studioManifest.push(
      ConfigUtils.buildStudioManifestForKeyWithSpace(
        "key-2",
        "spaceName",
        null,
      ),
    );

    const firstPackageNode = ConfigUtils.buildPackageNode("key-2", {
      variables: [],
    });
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [],
      "1.0.0",
    );
    const exportedPackagesZip =
      ConfigUtils.buildBatchExportZipWithStudioManifest(
        manifest,
        studioManifest,
        [firstPackageZip],
      );

    const space: SpaceTransport = {
      id: "spaceId",
      name: "spaceName",
      iconReference: "earth",
    };
    mockReadFileSync(exportedPackagesZip.toBuffer());
    mockCreateReadStream(exportedPackagesZip.toBuffer());
    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/packages",
      [],
    );
    mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [
      space,
    ]);

    const importResponse: PostPackageImportData[] = [
      {
        packageKey: "key-1",
        importedVersions: [
          {
            oldVersion: "1.0.2",
            newVersion: "1.0.0",
          },
        ],
      },
    ];

    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch",
      importResponse,
    );

    await new ConfigCommandService(testContext).batchImportPackages(
      "./export_file.zip",
      null,
      true,
      null,
    );

    const expectedFileName =
      loggingTestTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      JSON.stringify(importResponse),
      { encoding: "utf-8" },
    );
    expect(mockedAxiosInstance.put).not.toHaveBeenCalledWith(
      "https://myTeam.celonis.cloud/package-manager/api/spaces",
      expect.anything(),
      expect.anything(),
    );
  });

  it("Should batch import configs & create new space", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "STUDIO"));

    const studioManifest: StudioPackageManifest[] = [];
    studioManifest.push(
      ConfigUtils.buildStudioManifestForKeyWithSpace(
        "key-2",
        "otherName",
        null,
      ),
    );

    const firstPackageNode = ConfigUtils.buildPackageNode("key-2", {
      variables: [],
    });
    const firstPackageZip = ConfigUtils.buildExportPackageZip(
      firstPackageNode,
      [],
      "1.0.0",
    );
    const exportedPackagesZip =
      ConfigUtils.buildBatchExportZipWithStudioManifest(
        manifest,
        studioManifest,
        [firstPackageZip],
      );

    const space: SpaceTransport = {
      id: "space-id",
      name: "space-name",
      iconReference: "earth",
    };

    const newSpace: SpaceTransport = {
      id: "otherId",
      name: "otherName",
      iconReference: "earth",
    };

    mockReadFileSync(exportedPackagesZip.toBuffer());
    mockCreateReadStream(exportedPackagesZip.toBuffer());
    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/packages",
      [],
    );
    mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [
      space,
    ]);
    mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/spaces", [
      newSpace,
    ]);

    const importResponse: PostPackageImportData[] = [
      {
        packageKey: "key-1",
        importedVersions: [
          {
            oldVersion: "1.0.2",
            newVersion: "1.0.0",
          },
        ],
      },
    ];

    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch",
      importResponse,
    );

    await new ConfigCommandService(testContext).batchImportPackages(
      "./export_file.zip",
      null,
      true,
      null,
    );

    const expectedFileName =
      loggingTestTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      JSON.stringify(importResponse),
      { encoding: "utf-8" },
    );
    expect(mockedAxiosInstance.put).not.toHaveBeenCalledWith(
      "https://myTeam.celonis.cloud/package-manager/api/spaces",
      expect.anything(),
      expect.anything(),
    );
  });

  it("Should assign studio runtime variable values after import", async () => {
    const manifest: PackageManifestTransport[] = [];
    manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", "STUDIO"));
    const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);
    const variableAssignment: VariablesAssignments = {
      key: "variable-1",
      type: PackageManagerVariableType.PLAIN_TEXT,
      value: "some-value" as unknown as object,
    };
    const studioManifest: StudioPackageManifest[] = [
      {
        packageKey: "key-1",
        space: {
          id: "space-id",
          name: "space",
          iconReference: "earth",
        },
        runtimeVariableAssignments: [variableAssignment],
      },
    ];
    exportedPackagesZip.addFile(
      BatchExportImportConstants.STUDIO_FILE_NAME,
      Buffer.from(stringify(studioManifest)),
    );

    mockReadFileSync(exportedPackagesZip.toBuffer());
    mockCreateReadStream(exportedPackagesZip.toBuffer());

    const importResponse: PostPackageImportData[] = [
      {
        packageKey: "key-1",
        importedVersions: [
          {
            oldVersion: "1.0.2",
            newVersion: "1.0.0",
          },
        ],
      },
    ];

    const node: Partial<ContentNodeTransport> = {
      id: "node-id",
      key: "key-1",
    };

    const space: SpaceTransport = {
      id: "space-id",
      name: "space",
      iconReference: "earth",
    };

    const assignVariablesUrl =
      "https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/key-1/variables/values";

    mockAxiosPost(
      "https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch",
      importResponse,
    );
    mockAxiosGet(
      "https://myTeam.celonis.cloud/package-manager/api/nodes/key-1/key-1",
      node,
    );
    mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [
      space,
    ]);
    mockAxiosPut(
      "https://myTeam.celonis.cloud/package-manager/api/packages/node-id/move/space-id",
      {},
    );
    mockAxiosPost(assignVariablesUrl, {});
    mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages", [
      node,
    ]);

    await new ConfigCommandService(testContext).batchImportPackages(
      "./export_file.zip",
      null,
      true,
      null,
    );

    const expectedFileName =
      loggingTestTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      JSON.stringify(importResponse),
      { encoding: "utf-8" },
    );

    expect(mockedPostRequestBodyByUrl.get(assignVariablesUrl)).toEqual(
      JSON.stringify([variableAssignment]),
    );
  });
});
