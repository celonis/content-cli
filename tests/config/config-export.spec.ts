import {ConfigUtils} from "../utls/config-utils";
import {
    DependencyTransport, NodeExportTransport, NodeSerializedContent,
    PackageManifestTransport,
    StudioPackageManifest,
    VariableManifestTransport
} from "../../src/interfaces/package-export-transport";
import {mockAxiosGet, mockAxiosPost, mockedPostRequestBodyByUrl} from "../utls/http-requests-mock";
import {ConfigCommand} from "../../src/commands/config.command";
import {PackageManagerApiUtils} from "../utls/package-manager-api.utils";
import {mockWriteSync, testTransport} from "../jest.setup";
import {FileService} from "../../src/services/file-service";
import * as fs from "fs";
import AdmZip = require("adm-zip");

import { parse, stringify } from "../../src/util/yaml";
import {
    PackageManagerVariableType,
    VariableDefinition,
    VariablesAssignments
} from "../../src/interfaces/package-manager.interfaces";
import {BatchExportImportConstants} from "../../src/interfaces/batch-export-import-constants";

describe("Config export", () => {

    const firstSpace = PackageManagerApiUtils.buildSpaceTransport("space-1", "First space", "Icon1");
    const secondSpace = PackageManagerApiUtils.buildSpaceTransport("space-2", "Second space", "Icon2");

    beforeEach(() => {
        (fs.openSync as jest.Mock).mockReturnValue(100);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces/space-1", {...firstSpace});
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/spaces/space-2", {...secondSpace});
    });

    it("Should export studio file for studio packageKeys", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", BatchExportImportConstants.STUDIO));
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", BatchExportImportConstants.STUDIO));
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-3", "TEST"));
        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);

        const firstStudioPackage = PackageManagerApiUtils.buildContentNodeTransport("key-1", "space-1");
        const firstPackageRuntimeVariable: VariablesAssignments = {
            key: "varKey",
            type: PackageManagerVariableType.PLAIN_TEXT,
            value: "default-value" as unknown as object
        };

        const secondStudioPackage = PackageManagerApiUtils.buildContentNodeTransport("key-2", "space-2");

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&packageKeys=key-3&withDependencies=true", exportedPackagesZip.toBuffer());
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments", []);
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/${firstStudioPackage.key}/${firstStudioPackage.key}`, firstStudioPackage);
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/${secondStudioPackage.key}/${secondStudioPackage.key}`, secondStudioPackage);
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstStudioPackage.key}/variables/runtime-values`, [firstPackageRuntimeVariable]);
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondStudioPackage.key}/variables/runtime-values`, []);

        await new ConfigCommand().batchExportPackages(["key-1", "key-2", "key-3"], true);

        const expectedFileName = testTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(fs.openSync).toHaveBeenCalledWith(expectedFileName, expect.anything(), expect.anything());
        expect(mockWriteSync).toHaveBeenCalled();

        const fileBuffer = mockWriteSync.mock.calls[0][1];
        const actualZip = new AdmZip(fileBuffer);

        const studioManifest: StudioPackageManifest[] = parse(actualZip.getEntry(BatchExportImportConstants.STUDIO_FILE_NAME).getData().toString());
        expect(studioManifest).toHaveLength(2);
        expect(studioManifest).toContainEqual({
            packageKey: firstStudioPackage.key,
            space: {
                name: firstSpace.name,
                iconReference: firstSpace.iconReference
            },
            runtimeVariableAssignments: [firstPackageRuntimeVariable]
        });
        expect(studioManifest).toContainEqual({
            packageKey: secondStudioPackage.key,
            space: {
                name: secondSpace.name,
                iconReference: secondSpace.iconReference
            },
            runtimeVariableAssignments: []
        });
    })

    it("Should export variables file with connection variables fixed", async () => {
        const firstPackageDependencies = new Map<string, DependencyTransport[]>();
        firstPackageDependencies.set("1.0.0", []);

        const secondPackageDependencies = new Map<string, DependencyTransport[]>();
        secondPackageDependencies.set("1.0.0", []);
        secondPackageDependencies.set("1.1.1", []);

        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", BatchExportImportConstants.STUDIO, firstPackageDependencies));
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", BatchExportImportConstants.STUDIO, secondPackageDependencies));

        const firstPackageVariableDefinition: VariableDefinition[] = [
            {
                key: "key1-var",
                type: PackageManagerVariableType.DATA_MODEL,
                runtime: false
            },
            {
                key: "key-1-connection",
                type: PackageManagerVariableType.CONNECTION,
                runtime: false
            }
        ];

        const firstPackageNode = ConfigUtils.buildPackageNode("key-1", stringify({variables: firstPackageVariableDefinition}));
        const firstPackageZip = ConfigUtils.buildExportPackageZip(firstPackageNode, [], "1.0.0");

        const secondPackageVariableDefinition: VariableDefinition[] = [
            {
                key: "key2-var",
                type: PackageManagerVariableType.DATA_MODEL,
                runtime: false
            }
        ];

        const secondPackageNode = ConfigUtils.buildPackageNode("key-2", stringify({variables: secondPackageVariableDefinition}));
        const secondPackageZip = ConfigUtils.buildExportPackageZip(secondPackageNode, [], "1.0.0");

        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [firstPackageZip, secondPackageZip]);

        const exportedVariables: VariableManifestTransport[] = [
            {
                packageKey: "key-1",
                version: "1.0.0",
                variables: [
                    {
                        key: "key1-var",
                        type: PackageManagerVariableType.DATA_MODEL,
                        value: "dm-id" as unknown as object,
                        metadata: {}
                    },
                    {
                        key: "key-1-connection",
                        type: PackageManagerVariableType.CONNECTION,
                        value: {
                            appName: "celonis",
                            connectionId: "connection-id"
                        } as unknown as object,
                        metadata: null
                    }
                ]
            },
            {
                packageKey: "key-2",
                version: "1.0.0",
                variables: [
                    {
                        key: "key2-var",
                        type: PackageManagerVariableType.DATA_MODEL,
                        value: "dm-id" as unknown as object,
                        metadata: {}
                    }
                ]
            },
        ];

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&withDependencies=true", exportedPackagesZip.toBuffer());
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments", [...exportedVariables]);
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`, {...firstPackageNode, spaceId: "space-1"});
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/${secondPackageNode.key}/${secondPackageNode.key}`, {...secondPackageNode, spaceId: "space-2"});
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values`, []);
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondPackageNode.key}/variables/runtime-values`, []);

        await new ConfigCommand().batchExportPackages(["key-1", "key-2"], true);

        const expectedFileName = testTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(fs.openSync).toHaveBeenCalledWith(expectedFileName, expect.anything(), expect.anything());
        expect(mockWriteSync).toHaveBeenCalled();

        const fileBuffer = mockWriteSync.mock.calls[0][1];
        const actualZip = new AdmZip(fileBuffer);

        const exportedVariablesFileContent: VariableManifestTransport[] = parse(actualZip.getEntry(BatchExportImportConstants.VARIABLES_FILE_NAME).getData().toString());
        expect(exportedVariablesFileContent).toHaveLength(2);
        expect(exportedVariablesFileContent).toContainEqual({
            packageKey: "key-1",
            version: "1.0.0",
            variables: [
                {
                    key: "key1-var",
                    type: PackageManagerVariableType.DATA_MODEL,
                    value: "dm-id",
                    metadata: {}
                },
                {
                    key: "key-1-connection",
                    type: PackageManagerVariableType.CONNECTION,
                    value: {
                        appName: "celonis",
                        connectionId: "connection-id"
                    },
                    metadata: {
                        appName: "celonis"
                    }
                }
            ]
        });
        expect(exportedVariablesFileContent).toContainEqual({
            packageKey: "key-2",
            version: "1.0.0",
            variables: [
                {
                    key: "key2-var",
                    type: PackageManagerVariableType.DATA_MODEL,
                    value: "dm-id",
                    metadata: {}
                }
            ]
        });

        const variableExportRequest = parse(mockedPostRequestBodyByUrl.get("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments"));
        expect(variableExportRequest).toBeTruthy();
        expect(variableExportRequest).toHaveLength(3);
        expect(variableExportRequest).toContainEqual({
            packageKey: "key-1",
            version: "1.0.0"
        });
        expect(variableExportRequest).toContainEqual({
            packageKey: "key-2",
            version: "1.0.0"
        });
        expect(variableExportRequest).toContainEqual({
            packageKey: "key-2",
            version: "1.1.1"
        });
    })

    it("Should remove SCENARIO asset files of packages", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", BatchExportImportConstants.STUDIO));
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", BatchExportImportConstants.STUDIO));

        const firstPackageNode = ConfigUtils.buildPackageNode("key-1", "");
        const firstPackageScenarioChild = ConfigUtils.buildChildNode("child-1-scenario", firstPackageNode.key, "SCENARIO");
        const firstPackageTestChild = ConfigUtils.buildChildNode("child-2", firstPackageNode.key, "TEST");
        const firstPackageZip = ConfigUtils.buildExportPackageZip(firstPackageNode, [firstPackageScenarioChild, firstPackageTestChild], "1.0.0");

        const secondPackageNode = ConfigUtils.buildPackageNode("key-2", "");
        const secondPackageScenarioChild = ConfigUtils.buildChildNode("child-3-scenario", secondPackageNode.key, "SCENARIO");
        const secondPackageTestChild = ConfigUtils.buildChildNode("child-4", secondPackageNode.key, "TEST");
        const secondPackageZip = ConfigUtils.buildExportPackageZip(secondPackageNode, [secondPackageScenarioChild, secondPackageTestChild], "1.0.0");

        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [firstPackageZip, secondPackageZip]);

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&withDependencies=true", exportedPackagesZip.toBuffer());
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments", []);
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`, {...firstPackageNode, spaceId: "space-1"});
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/${secondPackageNode.key}/${secondPackageNode.key}`, {...secondPackageNode, spaceId: "space-2"});
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values`, []);
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondPackageNode.key}/variables/runtime-values`, []);

        await new ConfigCommand().batchExportPackages(["key-1", "key-2"], true);

        const expectedFileName = testTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(fs.openSync).toHaveBeenCalledWith(expectedFileName, expect.anything(), expect.anything());
        expect(mockWriteSync).toHaveBeenCalled();

        const fileBuffer = mockWriteSync.mock.calls[0][1];
        const actualZip = new AdmZip(fileBuffer);

        const firstPackageExportedZip = new AdmZip(actualZip.getEntry("key-1_1.0.0.zip").getData());
        expect(firstPackageExportedZip.getEntry("nodes/child-1-scenario.yml")).toBeNull();
        expect(firstPackageExportedZip.getEntry("nodes/child-2.yml").getData().toString()).toEqual(stringify(firstPackageTestChild));

        const secondPackageExportedZip = new AdmZip(actualZip.getEntry("key-2_1.0.0.zip").getData());
        expect(secondPackageExportedZip.getEntry("nodes/child-3-scenario.yml")).toBeNull();
        expect(secondPackageExportedZip.getEntry("nodes/child-4.yml").getData().toString()).toEqual(stringify(secondPackageTestChild));
    })

    it("Should add appName to metadata for CONNECTION variables of package.yml files", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", BatchExportImportConstants.STUDIO));
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", BatchExportImportConstants.STUDIO));

        const firstPackageVariableDefinition: VariableDefinition[] = [
            {
                key: "key1-var",
                type: PackageManagerVariableType.DATA_MODEL,
                runtime: false
            },
            {
                key: "key-1-connection",
                type: PackageManagerVariableType.CONNECTION,
                runtime: false
            }
        ];

        const firstPackageNode = ConfigUtils.buildPackageNode("key-1", stringify({variables: firstPackageVariableDefinition}));
        const firstPackageZip = ConfigUtils.buildExportPackageZip(firstPackageNode, [], "1.0.0");

        const secondPackageVariableDefinition: VariableDefinition[] = [
            {
                key: "key2-var",
                type: PackageManagerVariableType.CONNECTION,
                runtime: false,
                metadata: {
                    appName: "celonis"
                }
            }
        ];

        const secondPackageNode = ConfigUtils.buildPackageNode("key-2", stringify({variables: secondPackageVariableDefinition}));
        const secondPackageZip = ConfigUtils.buildExportPackageZip(secondPackageNode, [], "1.0.0");

        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, [firstPackageZip, secondPackageZip]);

        const exportedVariables: VariableManifestTransport[] = [
            {
                packageKey: "key-1",
                version: "1.0.0",
                variables: [
                    {
                        key: "key1-var",
                        type: PackageManagerVariableType.DATA_MODEL,
                        value: "dm-id" as unknown as object,
                        metadata: {}
                    },
                    {
                        key: "key-1-connection",
                        type: PackageManagerVariableType.CONNECTION,
                        value: {
                            appName: "celonis",
                            connectionId: "connection-id"
                        } as unknown as object,
                        metadata: null
                    }
                ]
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
                            connectionId: "connection-id"
                        } as unknown as object,
                        metadata: {
                            appName: "celonis"
                        }
                    }
                ]
            },
        ];

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&withDependencies=true", exportedPackagesZip.toBuffer());
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments", exportedVariables);
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/${firstPackageNode.key}/${firstPackageNode.key}`, {...firstPackageNode, spaceId: "space-1"});
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/${secondPackageNode.key}/${secondPackageNode.key}`, {...secondPackageNode, spaceId: "space-2"});
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${firstPackageNode.key}/variables/runtime-values`, []);
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/by-package-key/${secondPackageNode.key}/variables/runtime-values`, []);

        await new ConfigCommand().batchExportPackages(["key-1", "key-2"], true);

        const expectedFileName = testTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(fs.openSync).toHaveBeenCalledWith(expectedFileName, expect.anything(), expect.anything());
        expect(mockWriteSync).toHaveBeenCalled();

        const fileBuffer = mockWriteSync.mock.calls[0][1];
        const actualZip = new AdmZip(fileBuffer);

        const firstPackageExportedZip = new AdmZip(actualZip.getEntry("key-1_1.0.0.zip").getData());
        const firstPackageExportedNode: NodeExportTransport = parse(firstPackageExportedZip.getEntry("package.yml").getData().toString());
        expect(firstPackageExportedNode).toBeTruthy();
        const firstPackageContent: NodeSerializedContent = parse(firstPackageExportedNode.serializedContent);
        expect(firstPackageContent.variables).toHaveLength(2);
        expect(firstPackageContent.variables).toEqual([
            {
                ...firstPackageVariableDefinition[0],
            },
            {
                ...firstPackageVariableDefinition[1],
                metadata: {
                    appName: "celonis"
                }
            }
        ]);

        const secondPackageExportedZip = new AdmZip(actualZip.getEntry("key-2_1.0.0.zip").getData());
        const secondPackageExportedNode: NodeExportTransport = parse(secondPackageExportedZip.getEntry("package.yml").getData().toString());
        expect(secondPackageExportedNode).toBeTruthy();
        const secondPackageContent: NodeSerializedContent = parse(secondPackageExportedNode.serializedContent);
        expect(secondPackageContent.variables).toHaveLength(1);
        expect(secondPackageContent.variables).toEqual([...secondPackageVariableDefinition]);
    })

    it("Should export by packageKeys without dependencies", async () => {
        const manifest: PackageManifestTransport[] = [];
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-1", "TEST"));
        manifest.push(ConfigUtils.buildManifestForKeyAndFlavor("key-2", "TEST"));
        const exportedPackagesZip = ConfigUtils.buildBatchExportZip(manifest, []);

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch?packageKeys=key-1&packageKeys=key-2&packageKeys=key-3&withDependencies=false", exportedPackagesZip.toBuffer());
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments", []);

        await new ConfigCommand().batchExportPackages(["key-1", "key-2", "key-3"], false);

        const expectedFileName = testTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(fs.openSync).toHaveBeenCalledWith(expectedFileName, expect.anything(), expect.anything());
        expect(mockWriteSync).toHaveBeenCalled();
    })
})