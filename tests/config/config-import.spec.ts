import {ConfigCommand} from "../../src/commands/config.command";
import {
    mockAxiosGet,
    mockAxiosPost,
    mockAxiosPut, mockedPostRequestBodyByUrl
} from "../utls/http-requests-mock";
import {
    PackageManifestTransport,
    PostPackageImportData,
    StudioPackageManifest
} from "../../src/interfaces/package-export-transport";
import {ConfigUtils} from "../utls/config-utils";
import {mockWriteFileSync, testTransport} from "../jest.setup";
import * as path from "path";
import {stringify} from "../../src/util/yaml";
import {SpaceTransport} from "../../src/interfaces/save-space.interface";
import {packageApi} from "../../src/api/package-api";
import {
    ContentNodeTransport,
    PackageManagerVariableType,
    VariablesAssignments
} from "../../src/interfaces/package-manager.interfaces";
import {mockCreateReadStream, mockExistsSync, mockReadFileSync} from "../utls/fs-mock-utils";
import {BatchExportImportConstants} from "../../src/interfaces/batch-export-import-constants";

import {spaceApi} from "../../src/api/space-api";

describe("Config import", () => {

    const LOG_MESSAGE: string = "Config import report file: ";

    beforeEach(() => {
        mockExistsSync();
    })

    it.each([
        true,
        false
    ]) ("Should batch import package configs with overwrite %p", async (overwrite: boolean) => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", "TEST"));
        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);

        mockReadFileSync(exportedPackagesZip.toBuffer());
        mockCreateReadStream(exportedPackagesZip.toBuffer());
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages", []);

        const importResponse: PostPackageImportData[] = [{
            packageKey: "key-1",
            importedVersions: [{
                oldVersion: "1.0.2",
                newVersion: "1.0.0"
            }]
        }];

        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch", importResponse);

        await new ConfigCommand().batchImportPackages("./export_file.zip", overwrite);

        const expectedFileName = testTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(importResponse), {encoding: "utf-8"});
    })

    it("Should batch import configs & map space ID as specified in manifest file for Studio Packages", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "STUDIO"));

        const studioManifest: StudioPackageManifest[] = [];
        studioManifest.push(ConfigUtils.buildStudioManifestForKeyWithSpace("key-2", "spaceName", "space-id"));

        const firstPackageNode = ConfigUtils.buildPackageNode("key-2", stringify({variables: []}));
        const firstPackageZip = ConfigUtils.buildExportPackageZip(firstPackageNode, [], "1.0.0");
        const exportedPackagesZip = ConfigUtils.buildBatchExportZipWithStudioManifest(manifest, studioManifest,[firstPackageZip]);

        const space: SpaceTransport = {
            id: "space-id",
            name: "space",
            iconReference: "earth"
        };

        const otherSpace: SpaceTransport = {
            id: "spaceId",
            name: "spaceName",
            iconReference: "earth"
        };

        mockReadFileSync(exportedPackagesZip.toBuffer());
        mockCreateReadStream(exportedPackagesZip.toBuffer());
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages", []);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [space, otherSpace]);

        const importResponse: PostPackageImportData[] = [{
            packageKey: "key-1",
            importedVersions: [{
                oldVersion: "1.0.2",
                newVersion: "1.0.0"
            }]
        }];

        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch", importResponse);

        await new ConfigCommand().batchImportPackages("./export_file.zip", true);

        const expectedFileName = testTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(importResponse), {encoding: "utf-8"});
    })

    it("Should fail to map space ID as the space id specified in manifest file cannot be found", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "STUDIO"));

        const studioManifest: StudioPackageManifest[] = [];
        studioManifest.push(ConfigUtils.buildStudioManifestForKeyWithSpace("key-2", "spaceName", "space"));

        const firstPackageNode = ConfigUtils.buildPackageNode("key-2", stringify({variables: []}));
        const firstPackageZip = ConfigUtils.buildExportPackageZip(firstPackageNode, [], "1.0.0");
        const exportedPackagesZip = ConfigUtils.buildBatchExportZipWithStudioManifest(manifest, studioManifest,[firstPackageZip]);

        const space: SpaceTransport = {
            id: "space-id",
            name: "space",
            iconReference: "earth"
        };

        mockReadFileSync(exportedPackagesZip.toBuffer());
        mockCreateReadStream(exportedPackagesZip.toBuffer());
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages", []);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [space]);

        await expect(
            new ConfigCommand().batchImportPackages("./export_file.zip", true)
        ).rejects.toThrow("Provided space ID does not exist.");
    })

    it("Should batch import configs & map space ID as specified in manifest file for Studio Packages & move to space for existing packages.", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "STUDIO"));

        const studioManifest: StudioPackageManifest[] = [];
        studioManifest.push(ConfigUtils.buildStudioManifestForKeyWithSpace("key-2", "space", "spaceId"));

        const firstPackageNode = ConfigUtils.buildPackageNode("key-2", stringify({variables: []}));
        const firstPackageZip = ConfigUtils.buildExportPackageZip(firstPackageNode, [], "1.0.0");
        const exportedPackagesZip = ConfigUtils.buildBatchExportZipWithStudioManifest(manifest, studioManifest,[firstPackageZip]);


        const existingNode: Partial<ContentNodeTransport> = {
            id: "node-id",
            key: "key-2"
        }

        const space: SpaceTransport = {
            id: "spaceId",
            name: "space",
            iconReference: "earth"
        };

        mockReadFileSync(exportedPackagesZip.toBuffer());
        mockCreateReadStream(exportedPackagesZip.toBuffer());
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages", [existingNode]);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [space]);
        mockAxiosPut("https://myTeam.celonis.cloud/package-manager/api/packages/node-id/move/spaceId", {});

        const importResponse: PostPackageImportData[] = [{
            packageKey: "key-1",
            importedVersions: [{
                oldVersion: "1.0.2",
                newVersion: "1.0.0"
            }]
        }];

        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch", importResponse);
        const movePackageToSpaceSpy = jest.spyOn(packageApi, "movePackageToSpace");

        await new ConfigCommand().batchImportPackages("./export_file.zip", true);
        const expectedFileName = testTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(importResponse), {encoding: "utf-8"});
        expect(movePackageToSpaceSpy).toBeCalledTimes(1)
        expect(movePackageToSpaceSpy).toHaveBeenCalledWith("node-id", "spaceId");
    })

    it("Should batch import configs & map space ID by finding space with name as specified in manifest file", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "STUDIO"));

        const studioManifest: StudioPackageManifest[] = [];
        studioManifest.push(ConfigUtils.buildStudioManifestForKeyWithSpace("key-2", "spaceName", null));

        const firstPackageNode = ConfigUtils.buildPackageNode("key-2", stringify({variables: []}));
        const firstPackageZip = ConfigUtils.buildExportPackageZip(firstPackageNode, [], "1.0.0");
        const exportedPackagesZip = ConfigUtils.buildBatchExportZipWithStudioManifest(manifest, studioManifest,[firstPackageZip]);

        const space: SpaceTransport = {
            id: "spaceId",
            name: "spaceName",
            iconReference: "earth"
        };
        mockReadFileSync(exportedPackagesZip.toBuffer());
        mockCreateReadStream(exportedPackagesZip.toBuffer());
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages", []);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [space]);

        const importResponse: PostPackageImportData[] = [{
            packageKey: "key-1",
            importedVersions: [{
                oldVersion: "1.0.2",
                newVersion: "1.0.0"
            }]
        }];

        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch", importResponse);
        const createSpaceSpy = jest.spyOn(spaceApi, "createSpace");

        await new ConfigCommand().batchImportPackages("./export_file.zip", true);

        const expectedFileName = testTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(importResponse), {encoding: "utf-8"});
        expect(createSpaceSpy).toBeCalledTimes(0)
    })

    it("Should batch import configs & create new space", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "STUDIO"));

        const studioManifest: StudioPackageManifest[] = [];
        studioManifest.push(ConfigUtils.buildStudioManifestForKeyWithSpace("key-2", "otherName", null));

        const firstPackageNode = ConfigUtils.buildPackageNode("key-2", stringify({variables: []}));
        const firstPackageZip = ConfigUtils.buildExportPackageZip(firstPackageNode, [], "1.0.0");
        const exportedPackagesZip = ConfigUtils.buildBatchExportZipWithStudioManifest(manifest, studioManifest,[firstPackageZip]);

        const space: SpaceTransport = {
            id: "space-id",
            name: "space-name",
            iconReference: "earth"
        };

        const newSpace: SpaceTransport = {
            id: "otherId",
            name: "otherName",
            iconReference: "earth"
        };

        mockReadFileSync(exportedPackagesZip.toBuffer());
        mockCreateReadStream(exportedPackagesZip.toBuffer());
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages", []);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [space]);
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/spaces", [newSpace]);


        const importResponse: PostPackageImportData[] = [{
            packageKey: "key-1",
            importedVersions: [{
                oldVersion: "1.0.2",
                newVersion: "1.0.0"
            }]
        }];

        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch", importResponse);
        const createSpaceSpy = jest.spyOn(spaceApi, "createSpace");

        await new ConfigCommand().batchImportPackages("./export_file.zip", true);

        const expectedFileName = testTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(importResponse), {encoding: "utf-8"});
        expect(createSpaceSpy).toBeCalledTimes(1)
    })

    it("Should assign studio runtime variable values after import", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", "STUDIO"));
        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);
        const variableAssignment: VariablesAssignments = {
            key: "variable-1",
            type: PackageManagerVariableType.PLAIN_TEXT,
            value: "some-value" as unknown as object
        }
        const studioManifest: StudioPackageManifest[] = [{
            packageKey: "key-1",
            space: {
                id: "space-id",
                name: "space",
                iconReference: "earth"
            },
            runtimeVariableAssignments: [variableAssignment]
        }];
        exportedPackagesZip.addFile(BatchExportImportConstants.STUDIO_FILE_NAME, Buffer.from(stringify(studioManifest)));

        mockReadFileSync(exportedPackagesZip.toBuffer());
        mockCreateReadStream(exportedPackagesZip.toBuffer());

        const importResponse: PostPackageImportData[] = [{
            packageKey: "key-1",
            importedVersions: [{
                oldVersion: "1.0.2",
                newVersion: "1.0.0"
            }]
        }];

        const node: Partial<ContentNodeTransport> = {
            id: "node-id",
            key: "key-1"
        }

        const space: SpaceTransport = {
            id: "space-id",
            name: "space",
            iconReference: "earth"
        };

        const assignVariablesUrl = "https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/key-1/variables/values";

        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch", importResponse);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/nodes/key-1/key-1", node);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [space]);
        mockAxiosPut("https://myTeam.celonis.cloud/package-manager/api/packages/node-id/move/space-id", {});
        mockAxiosPost(assignVariablesUrl, {});
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages", [node]);

        await new ConfigCommand().batchImportPackages("./export_file.zip", true);

        const expectedFileName = testTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(importResponse), {encoding: "utf-8"});

        expect(mockedPostRequestBodyByUrl.get(assignVariablesUrl)).toEqual(JSON.stringify([variableAssignment]));    })
})
