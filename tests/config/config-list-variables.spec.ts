import {ConfigCommand} from "../../src/commands/config.command";
import {mockWriteFileSync, testTransport} from "../jest.setup";
import {FileService} from "../../src/services/file-service";
import * as path from "path";
import {PackageKeyAndVersionPair, VariableManifestTransport} from "../../src/interfaces/package-export-transport";
import {PackageManagerVariableType} from "../../src/interfaces/package-manager.interfaces";
import {mockAxiosPost, mockedPostRequestBodyByUrl} from "../utls/http-requests-mock";
import {parse} from "../../src/util/yaml";
import * as fs from "fs";

describe("Config listVariables", () => {

    const firstManifest: VariableManifestTransport = {
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
    };

    const secondManifest: VariableManifestTransport = {
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
    };

    const thirdManifest: VariableManifestTransport = {
        packageKey: "key-3",
        version: "1.0.0",
        variables: [
            {
                key: "key2-var",
                type: PackageManagerVariableType.CONNECTION,
                value: "connection-id",
                metadata: {
                    appName: "celonis"
                }
            }
        ]
    }

    const fixedVariableManifests: VariableManifestTransport[] = [
        {
            ...firstManifest,
            variables: [
                {
                    ...firstManifest.variables[0]
                },
                {
                    ...firstManifest.variables[1],
                    metadata: {
                        appName: "celonis"
                    }
                }
            ]
        },
        {
            ...secondManifest
        },
        {
            ...thirdManifest
        }
    ];

    const packageKeyAndVersionPairs: PackageKeyAndVersionPair[] = [
        {
            packageKey: "key-1",
            version: "1.0.0"
        },
        {
            packageKey: "key-2",
            version: "1.0.0"
        },
        {
            packageKey: "key-3",
            version: "1.0.0"
        }
    ];

    beforeEach(() => {
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments", [{...firstManifest}, {...secondManifest}, {...thirdManifest}]);
    })

    it("Should list fixed variables for non-json response", async () => {
        await new ConfigCommand().listVariables(false, ["key-1:1.0.0", "key-2:1.0.0", "key-3:1.0.0"], null);

        expect(testTransport.logMessages.length).toBe(3);
        expect(testTransport.logMessages[0].message).toContain(JSON.stringify(fixedVariableManifests[0]));
        expect(testTransport.logMessages[1].message).toContain(JSON.stringify(fixedVariableManifests[1]));
        expect(testTransport.logMessages[2].message).toContain(JSON.stringify(fixedVariableManifests[2]));

        const variableExportRequest = parse(mockedPostRequestBodyByUrl.get("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments"));
        expect(variableExportRequest).toEqual(packageKeyAndVersionPairs);
    })

    it("Should export fixed variables for json response", async () => {
        await new ConfigCommand().listVariables(true, ["key-1:1.0.0", "key-2:1.0.0", "key-3:1.0.0"], null);

        expect(testTransport.logMessages.length).toBe(1);
        expect(testTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);

        const expectedFileName = testTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(fixedVariableManifests), {encoding: "utf-8"});

        const variableExportRequest = parse(mockedPostRequestBodyByUrl.get("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments"));
        expect(variableExportRequest).toEqual(packageKeyAndVersionPairs);
    })

    it("Should list fixed variables for non-json response and keysByVersion file mapping", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageKeyAndVersionPairs));

        await new ConfigCommand().listVariables(false, [], "key_version_mapping.json");

        expect(testTransport.logMessages.length).toBe(3);
        expect(testTransport.logMessages[0].message).toContain(JSON.stringify(fixedVariableManifests[0]));
        expect(testTransport.logMessages[1].message).toContain(JSON.stringify(fixedVariableManifests[1]));
        expect(testTransport.logMessages[2].message).toContain(JSON.stringify(fixedVariableManifests[2]));

        const variableExportRequest = parse(mockedPostRequestBodyByUrl.get("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments"));
        expect(variableExportRequest).toEqual(packageKeyAndVersionPairs);
    })

    it("Should export fixed variables for json response and keysByVersion file mapping", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageKeyAndVersionPairs));

        await new ConfigCommand().listVariables(true, [], "key_version_mapping.json");

        expect(testTransport.logMessages.length).toBe(1);
        expect(testTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);

        const expectedFileName = testTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(fixedVariableManifests), {encoding: "utf-8"});

        const variableExportRequest = parse(mockedPostRequestBodyByUrl.get("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments"));
        expect(variableExportRequest).toEqual(packageKeyAndVersionPairs);
    })

    it("Should throw error if no mapping or file path is provided", async () => {
        try {
            await new ConfigCommand().listVariables(true, [], "");
        } catch (e) {
            expect(e.message).toEqual("Please provide keysByVersion mappings or file path!");
        }
    })
})