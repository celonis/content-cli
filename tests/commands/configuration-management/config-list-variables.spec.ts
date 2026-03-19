import * as path from "path";
import * as fs from "fs";
import { parse } from "../../../src/core/utils/json";
import {
    PackageKeyAndVersionPair,
    VariableManifestTransport,
} from "../../../src/commands/configuration-management/interfaces/package-export.interfaces";
import { PackageManagerVariableType } from "../../../src/commands/studio/interfaces/package-manager.interfaces";
import { mockAxiosGet, mockAxiosPost, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { ConfigCommandService } from "../../../src/commands/configuration-management/config-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";

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
        await new ConfigCommandService(testContext).listVariables(false, ["key-1:1.0.0", "key-2:1.0.0", "key-3:1.0.0"], null);

        expect(loggingTestTransport.logMessages.length).toBe(3);
        expect(loggingTestTransport.logMessages[0].message).toContain(JSON.stringify(fixedVariableManifests[0]));
        expect(loggingTestTransport.logMessages[1].message).toContain(JSON.stringify(fixedVariableManifests[1]));
        expect(loggingTestTransport.logMessages[2].message).toContain(JSON.stringify(fixedVariableManifests[2]));

        const variableExportRequest = parse(mockedPostRequestBodyByUrl.get("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments"));
        expect(variableExportRequest).toEqual(packageKeyAndVersionPairs);
    })

    it("Should export fixed variables for json response", async () => {
        await new ConfigCommandService(testContext).listVariables(true, ["key-1:1.0.0", "key-2:1.0.0", "key-3:1.0.0"], null);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(fixedVariableManifests), {encoding: "utf-8"});

        const variableExportRequest = parse(mockedPostRequestBodyByUrl.get("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments"));
        expect(variableExportRequest).toEqual(packageKeyAndVersionPairs);
    })

    it("Should list fixed variables for non-json response and keysByVersion file mapping", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageKeyAndVersionPairs));

        await new ConfigCommandService(testContext).listVariables(false, [], "key_version_mapping.json");

        expect(loggingTestTransport.logMessages.length).toBe(3);
        expect(loggingTestTransport.logMessages[0].message).toContain(JSON.stringify(fixedVariableManifests[0]));
        expect(loggingTestTransport.logMessages[1].message).toContain(JSON.stringify(fixedVariableManifests[1]));
        expect(loggingTestTransport.logMessages[2].message).toContain(JSON.stringify(fixedVariableManifests[2]));

        const variableExportRequest = parse(mockedPostRequestBodyByUrl.get("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments"));
        expect(variableExportRequest).toEqual(packageKeyAndVersionPairs);
    })

    it("Should export fixed variables for json response and keysByVersion file mapping", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageKeyAndVersionPairs));

        await new ConfigCommandService(testContext).listVariables(true, [], "key_version_mapping.json");

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(fixedVariableManifests), {encoding: "utf-8"});

        const variableExportRequest = parse(mockedPostRequestBodyByUrl.get("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments"));
        expect(variableExportRequest).toEqual(packageKeyAndVersionPairs);
    })

    it("Should throw error if no mapping and no file path is provided", async () => {
        try {
            await new ConfigCommandService(testContext).listVariables(true, [], "");
        } catch (e) {
            expect(e.message).toEqual("Please provide keysByVersion mappings or file path!");
        }
    })

    const stagingVarsPkgA = [
        { key: "DATA_POOL", type: "SINGLE_VALUE", value: "pool-id-1" },
        { key: "OTHER", type: "CONNECTION", value: { connectionId: "c1" } },
    ];
    const stagingVarsPkgB = [{ key: "DATA_POOL", type: "SINGLE_VALUE", value: "pool-id-2" }];

    it("Should list staging variables per package via Pacman public API", async () => {
        mockAxiosGet(
            "https://myTeam.celonis.cloud/pacman/api/core/staging/packages/pkg-a/variables",
            stagingVarsPkgA
        );
        mockAxiosGet(
            "https://myTeam.celonis.cloud/pacman/api/core/staging/packages/pkg-b/variables",
            stagingVarsPkgB
        );

        await new ConfigCommandService(testContext).listVariables(false, [], "", true, ["pkg-a", "pkg-b"]);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            JSON.stringify({ packageKey: "pkg-a", variables: stagingVarsPkgA })
        );
        expect(loggingTestTransport.logMessages[1].message).toContain(
            JSON.stringify({ packageKey: "pkg-b", variables: stagingVarsPkgB })
        );
    });

    it("Should export staging variables as json file", async () => {
        mockAxiosGet(
            "https://myTeam.celonis.cloud/pacman/api/core/staging/packages/pkg-a/variables?type=SINGLE_VALUE",
            [stagingVarsPkgA[0]]
        );

        await new ConfigCommandService(testContext).listVariables(true, [], "", true, ["pkg-a"], "SINGLE_VALUE");

        expect(loggingTestTransport.logMessages.length).toBe(1);
        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            JSON.stringify([{ packageKey: "pkg-a", variables: [stagingVarsPkgA[0]] }]),
            { encoding: "utf-8" }
        );
    });

    it("Should throw when --staging without package keys", async () => {
        await expect(
            new ConfigCommandService(testContext).listVariables(false, [], "", true, [])
        ).rejects.toThrow("With --staging, provide at least one --packageKeys value.");
    });

    it("Should throw when --staging combined with keysByVersion", async () => {
        await expect(
            new ConfigCommandService(testContext).listVariables(false, ["k:1.0.0"], "", true, ["pkg-a"])
        ).rejects.toThrow("Do not combine --staging with --keysByVersion or --keysByVersionFile.");
    });

    it("Should throw when --packageKeys without --staging", async () => {
        await expect(
            new ConfigCommandService(testContext).listVariables(false, ["k:1.0.0"], "", false, ["pkg-a"])
        ).rejects.toThrow("--packageKeys is only used together with --staging.");
    });
})