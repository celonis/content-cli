import * as path from "path";
import { parse } from "../../../src/core/utils/json";
import {
    StagingVariableManifestTransport,
    VariableExportTransport,
} from "../../../src/commands/configuration-management/interfaces/package-export.interfaces";
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

describe("Config listStagingVariables", () => {

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

        await new ConfigCommandService(testContext).listStagingVariables(false, expectedPackageKeys, "");

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain(JSON.stringify(batchResponse[0]));
        expect(loggingTestTransport.logMessages[1].message).toContain(JSON.stringify(batchResponse[1]));

        const postBody = parse<string[]>(mockedPostRequestBodyByUrl.get(url));
        expect(postBody).toEqual(expectedPackageKeys);
    })

    it("Should export staging variables for json response", async () => {
        const filtered: StagingVariableManifestTransport[] = [
            { packageKey: "pkg-a", variables: [stagingVarsPkgA[0]] },
        ];
        const url = withQueryString(stagingVariablesByPackageKeysBaseUrl, { variableType: "SINGLE_VALUE" });
        mockAxiosPost(url, filtered);

        await new ConfigCommandService(testContext).listStagingVariables(true, ["pkg-a"], "SINGLE_VALUE");

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
    })

    it("Should throw error if no package keys are provided", async () => {
        try {
            await new ConfigCommandService(testContext).listStagingVariables(false, [], "");
        } catch (e) {
            expect(e.message).toEqual("Please provide at least one package key!");
        }
    })
});
