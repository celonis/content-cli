import * as path from "path";
import * as fs from "fs";
import { URLSearchParams } from "url";
import { parse } from "../../../src/core/utils/json";
import {
    PackageKeyAndVersionPair,
    StagingVariableManifestTransport,
    VariableExportTransport,
    VariableManifestTransport,
} from "../../../src/commands/configuration-management/interfaces/package-export.interfaces";
import { PackageManagerVariableType } from "../../../src/commands/studio/interfaces/package-manager.interfaces";
import { mockAxiosPost, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { ConfigCommandService } from "../../../src/commands/configuration-management/config-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";

function withQueryString(baseUrl: string, queryParams?: Record<string, string>): string {
    if (!queryParams || Object.keys(queryParams).length === 0) {
        return baseUrl;
    }
    return `${baseUrl}?${new URLSearchParams(queryParams).toString()}`;
}

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
        await new ConfigCommandService(testContext).listVariables(false, ["key-1:1.0.0", "key-2:1.0.0", "key-3:1.0.0"], "", [], "");

        expect(loggingTestTransport.logMessages.length).toBe(3);
        expect(loggingTestTransport.logMessages[0].message).toContain(JSON.stringify(fixedVariableManifests[0]));
        expect(loggingTestTransport.logMessages[1].message).toContain(JSON.stringify(fixedVariableManifests[1]));
        expect(loggingTestTransport.logMessages[2].message).toContain(JSON.stringify(fixedVariableManifests[2]));

        const variableExportRequest = parse(mockedPostRequestBodyByUrl.get("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments"));
        expect(variableExportRequest).toEqual(packageKeyAndVersionPairs);
    })

    it("Should export fixed variables for json response", async () => {
        await new ConfigCommandService(testContext).listVariables(true, ["key-1:1.0.0", "key-2:1.0.0", "key-3:1.0.0"], "", [], "");

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

        await new ConfigCommandService(testContext).listVariables(false, [], "key_version_mapping.json", [], "");

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

        await new ConfigCommandService(testContext).listVariables(true, [], "key_version_mapping.json", [], "");

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), JSON.stringify(fixedVariableManifests), {encoding: "utf-8"});

        const variableExportRequest = parse(mockedPostRequestBodyByUrl.get("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/batch/variables-with-assignments"));
        expect(variableExportRequest).toEqual(packageKeyAndVersionPairs);
    })

    it("Should throw error if no mapping and no file path is provided", async () => {
        try {
            await new ConfigCommandService(testContext).listVariables(true, [], "", [], "");
        } catch (e) {
            expect(e.message).toEqual("Please provide keysByVersion mappings or file path!");
        }
    })

    describe("staging variables via --packageKeys", () => {
        const stagingVariablesByPackageKeysBaseUrl =
            `${testContext.profile.team.replace(/\/$/, "")}/pacman/api/core/staging/packages/variables/by-package-keys`;

        const stagingVarsPkgA: VariableExportTransport[] = [
            { key: "DATA_POOL", type: "SINGLE_VALUE", value: "pool-id-1", metadata: {} },
            { key: "OTHER", type: "CONNECTION", value: { connectionId: "c1" }, metadata: {} },
        ];
        const stagingVarsPkgB: VariableExportTransport[] = [
            { key: "DATA_POOL", type: "SINGLE_VALUE", value: "pool-id-2", metadata: {} },
        ];

        const batchResponse: StagingVariableManifestTransport[] = [
            { packageKey: "pkg-a", variables: stagingVarsPkgA },
            { packageKey: "pkg-b", variables: stagingVarsPkgB },
        ];

        const expectedPackageKeys = ["pkg-a", "pkg-b"];

        it("Should list staging variables for non-json response", async () => {
            const url = stagingVariablesByPackageKeysBaseUrl;
            mockAxiosPost(url, batchResponse);

            await new ConfigCommandService(testContext).listVariables(false, [], "", expectedPackageKeys, "");

            expect(loggingTestTransport.logMessages.length).toBe(2);
            expect(loggingTestTransport.logMessages[0].message).toContain(JSON.stringify(batchResponse[0]));
            expect(loggingTestTransport.logMessages[1].message).toContain(JSON.stringify(batchResponse[1]));

            const postBody = parse<string[]>(mockedPostRequestBodyByUrl.get(url));
            expect(postBody).toEqual(expectedPackageKeys);
        });

        it("Should export staging variables for json response", async () => {
            const filtered: StagingVariableManifestTransport[] = [
                { packageKey: "pkg-a", variables: [stagingVarsPkgA[0]] },
            ];
            const url = withQueryString(stagingVariablesByPackageKeysBaseUrl, { variableType: "SINGLE_VALUE" });
            mockAxiosPost(url, filtered);

            await new ConfigCommandService(testContext).listVariables(true, [], "", ["pkg-a"], "SINGLE_VALUE");

            expect(loggingTestTransport.logMessages.length).toBe(1);
            expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);

            const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
            expect(mockWriteFileSync).toHaveBeenCalledWith(
                path.resolve(process.cwd(), expectedFileName),
                JSON.stringify(filtered),
                {encoding: "utf-8"}
            );

            const postBody = parse<string[]>(mockedPostRequestBodyByUrl.get(url));
            expect(postBody).toEqual(["pkg-a"]);
        });
    });
});
