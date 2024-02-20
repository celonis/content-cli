import {ConfigCommand} from "../../src/commands/config.command";
import {
    mockAxiosGet,
    mockAxiosPost,
    mockAxiosPut,
    mockAxios,
    mockedPostRequestBodyByUrl
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
import {PackageManagerVariableType, VariablesAssignments} from "../../src/interfaces/package-manager.interfaces";
import {mockCreateReadStream, mockExistsSync, mockReadFileSync} from "../utls/fs-mock-utils";
import {BatchExportImportConstants} from "../../src/interfaces/batch-export-import-constants";
import axios from "axios";

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

    it("Should move studio package to target space after import", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", "STUDIO"));
        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);
        const studioManifest: StudioPackageManifest[] = [{
            packageKey: "key-1",
            space: {
                name: "space",
                iconReference: "earth"
            },
            runtimeVariableAssignments: []
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

        const node = {
            id: "node-id",
            key: "key-1"
        }

        const space: SpaceTransport = {
            id: "space-id",
            name: "space",
            iconReference: "earth"
        };

        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch", importResponse);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/nodes/key-1/key-1", node);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", [space]);
        mockAxiosPut("https://myTeam.celonis.cloud/package-manager/api/packages/node-id/move/space-id", {});

       const movePackageToSpaceSpy = jest.spyOn(packageApi, "movePackageToSpace");

        await new ConfigCommand().batchImportPackages("./export_file.zip", true);

        const expectedFileName = testTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(importResponse), {encoding: "utf-8"});

        expect(movePackageToSpaceSpy).toHaveBeenCalledWith("node-id", "space-id");
    })

    it("Should create space to move package after import if target space does not exist", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", "STUDIO"));
        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);
        const studioManifest: StudioPackageManifest[] = [{
            packageKey: "key-1",
            space: {
                name: "new-space",
                iconReference: "earth"
            },
            runtimeVariableAssignments: []
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

        const node = {
            id: "node-id",
            key: "key-1"
        }

        const space: SpaceTransport = {
            id: "space-id",
            name: "new-space",
            iconReference: "earth"
        };

        const createSpaceUrl = "https://myTeam.celonis.cloud/package-manager/api/spaces";
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch", importResponse);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/nodes/key-1/key-1", node);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces", []);
        mockAxiosPost(createSpaceUrl, space);
        mockAxiosPut("https://myTeam.celonis.cloud/package-manager/api/packages/node-id/move/space-id", {});

        const movePackageToSpaceSpy = jest.spyOn(packageApi, "movePackageToSpace");

        await new ConfigCommand().batchImportPackages("./export_file.zip", true);

        const expectedFileName = testTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(importResponse), {encoding: "utf-8"});

        expect(movePackageToSpaceSpy).toHaveBeenCalledWith("node-id", "space-id");

        const createSpaceRequest: SpaceTransport = JSON.parse(mockedPostRequestBodyByUrl.get(createSpaceUrl));
        expect(createSpaceRequest.name).toEqual(space.name);
        expect(createSpaceRequest.iconReference).toEqual(space.iconReference);
    })

    it("Should assign studio runtime variable values after import", async () => {
        const {get, post, put} = mockAxios();

        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", "TEST"));
        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);
        const variableAssignment: VariablesAssignments = {
            key: "variable-1",
            type: PackageManagerVariableType.PLAIN_TEXT,
            value: "some-value" as unknown as object
        }
        const studioManifest: StudioPackageManifest[] = [{
            packageKey: "key-1",
            space: {
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

        const node = {
            id: "node-id",
            key: "key-1"
        }

        const space: SpaceTransport = {
            id: "space-id",
            name: "space",
            iconReference: "earth"
        };

        const assignVariablesUrl = "https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/key-1/variables/values";

        post("https://myTeam.celonis.cloud/package-manager/api/core/packages/import/batch", importResponse);
        get("https://myTeam.celonis.cloud/package-manager/api/nodes/key-1/key-1", node);
        get("https://myTeam.celonis.cloud/package-manager/api/spaces", [space]);
        put("https://myTeam.celonis.cloud/package-manager/api/packages/node-id/move/space-id", {});
        post(assignVariablesUrl, {});

        await new ConfigCommand().batchImportPackages("./export_file.zip", true);

        const expectedFileName = testTransport.logMessages[0].message.split(LOG_MESSAGE)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(importResponse), {encoding: "utf-8"});

        expect(axios.post as jest.Mock).toHaveBeenCalledWith(assignVariablesUrl, JSON.stringify([variableAssignment]), expect.any(Object));
    })
})
