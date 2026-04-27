import { mockAxiosPost, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";
import * as fs from "fs";

jest.mock("fs", () => ({
    ...jest.requireActual("fs"),
    readFileSync: jest.fn(),
}));

describe("Asset registry validate", () => {
    const validateResponse = {
        valid: false,
        diagnostics: [
            {
                severity: "ERROR",
                nodeKey: "my-view",
                assetType: "BOARD_V2",
                path: "$.components[0].type",
                code: "INVALID_ENUM_VALUE",
                message: "Invalid component type",
            },
        ],
    };

    const mockUrl = "https://myTeam.celonis.cloud/pacman/api/core/asset-registry/validate/BOARD_V2";

    describe("--configuration sub-mode (validate a raw configuration)", () => {
        it("Should validate with inline --configuration and print result", async () => {
            mockAxiosPost(mockUrl, validateResponse);

            await new AssetRegistryService(testContext).validate({
                assetType: "BOARD_V2",
                packageKey: "my-pkg",
                configuration: '{"components":[{"type":"bad"}]}',
                json: false,
            });

            expect(loggingTestTransport.logMessages.length).toBe(1);
            expect(loggingTestTransport.logMessages[0].message).toContain("INVALID_ENUM_VALUE");
        });

        it("Should validate with --configuration and save as JSON file", async () => {
            mockAxiosPost(mockUrl, validateResponse);

            await new AssetRegistryService(testContext).validate({
                assetType: "BOARD_V2",
                packageKey: "my-pkg",
                configuration: '{"components":[{"type":"bad"}]}',
                json: true,
            });

            const msg = loggingTestTransport.logMessages[0].message;
            const expectedFileName = msg.split(FileService.fileDownloadedMessage)[1];
            expect(mockWriteFileSync).toHaveBeenCalledWith(
                path.resolve(process.cwd(), expectedFileName),
                expect.any(String),
                expect.objectContaining({ encoding: "utf-8" })
            );
            const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
            expect(written.valid).toBe(false);
        });

        it("Should build the envelope with nodes[] using a synthetic node key", async () => {
            mockAxiosPost(mockUrl, validateResponse);

            await new AssetRegistryService(testContext).validate({
                assetType: "BOARD_V2",
                packageKey: "my-pkg",
                configuration: '{"components":[]}',
                json: false,
            });

            const captured = mockedPostRequestBodyByUrl.get(mockUrl);
            const parsed = typeof captured === "string" ? JSON.parse(captured) : captured;
            expect(parsed).toEqual({
                assetType: "BOARD_V2",
                packageKey: "my-pkg",
                nodes: [{ key: "validation-node", configuration: { components: [] } }],
            });
        });

        it("Should throw when --configuration is not valid JSON", async () => {
            await expect(
                new AssetRegistryService(testContext).validate({
                    assetType: "BOARD_V2",
                    packageKey: "my-pkg",
                    configuration: "not-json{",
                    json: false,
                })
            ).rejects.toThrow("Invalid JSON in --configuration.");
        });

        it("Should throw when --packageKey is missing", async () => {
            await expect(
                new AssetRegistryService(testContext).validate({
                    assetType: "BOARD_V2",
                    configuration: "{}",
                    json: false,
                })
            ).rejects.toThrow("--packageKey is required");
        });
    });

    describe("--nodeKey sub-mode (validate an already-stored node)", () => {
        it("Should build the envelope with nodeKeys[]", async () => {
            mockAxiosPost(mockUrl, validateResponse);

            await new AssetRegistryService(testContext).validate({
                assetType: "BOARD_V2",
                packageKey: "my-pkg",
                nodeKey: "my-view",
                json: false,
            });

            const captured = mockedPostRequestBodyByUrl.get(mockUrl);
            const parsed = typeof captured === "string" ? JSON.parse(captured) : captured;
            expect(parsed).toEqual({
                assetType: "BOARD_V2",
                packageKey: "my-pkg",
                nodeKeys: ["my-view"],
            });
        });

        it("Should throw when --packageKey is missing", async () => {
            await expect(
                new AssetRegistryService(testContext).validate({
                    assetType: "BOARD_V2",
                    nodeKey: "my-view",
                    json: false,
                })
            ).rejects.toThrow("--packageKey is required");
        });
    });

    describe("-f / --file mode (full ValidateRequest from file)", () => {
        const fullRequest = {
            assetType: "BOARD_V2",
            packageKey: "my-pkg",
            nodes: [{ key: "my-view", configuration: { components: [{ type: "bad" }] } }],
        };

        it("Should validate with -f file and print result", async () => {
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fullRequest));
            mockAxiosPost(mockUrl, validateResponse);

            await new AssetRegistryService(testContext).validate({
                assetType: "BOARD_V2",
                file: "request.json",
                json: false,
            });

            expect(fs.readFileSync).toHaveBeenCalledWith("request.json", "utf-8");
            expect(loggingTestTransport.logMessages[0].message).toContain("INVALID_ENUM_VALUE");
        });

        it("Should send the file body as-is (no envelope wrapping)", async () => {
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fullRequest));
            mockAxiosPost(mockUrl, validateResponse);

            await new AssetRegistryService(testContext).validate({
                assetType: "BOARD_V2",
                file: "request.json",
                json: false,
            });

            const captured = mockedPostRequestBodyByUrl.get(mockUrl);
            const parsed = typeof captured === "string" ? JSON.parse(captured) : captured;
            expect(parsed).toEqual(fullRequest);
        });

        it("Should throw when -f file contains invalid JSON", async () => {
            (fs.readFileSync as jest.Mock).mockReturnValue("not-json{");

            await expect(
                new AssetRegistryService(testContext).validate({
                    assetType: "BOARD_V2",
                    file: "bad.json",
                    json: false,
                })
            ).rejects.toThrow("Invalid JSON in -f bad.json.");
        });
    });

    describe("mutual exclusivity and missing modes", () => {
        it("Should throw when --nodeKey and --configuration are both provided", async () => {
            await expect(
                new AssetRegistryService(testContext).validate({
                    assetType: "BOARD_V2",
                    packageKey: "my-pkg",
                    nodeKey: "my-view",
                    configuration: "{}",
                    json: false,
                })
            ).rejects.toThrow("--nodeKey and --configuration are mutually exclusive");
        });

        it("Should throw when -f is combined with --packageKey", async () => {
            await expect(
                new AssetRegistryService(testContext).validate({
                    assetType: "BOARD_V2",
                    packageKey: "my-pkg",
                    file: "request.json",
                    json: false,
                })
            ).rejects.toThrow("-f is mutually exclusive");
        });

        it("Should throw when -f is combined with --nodeKey", async () => {
            await expect(
                new AssetRegistryService(testContext).validate({
                    assetType: "BOARD_V2",
                    nodeKey: "my-view",
                    file: "request.json",
                    json: false,
                })
            ).rejects.toThrow("-f is mutually exclusive");
        });

        it("Should throw when -f is combined with --configuration", async () => {
            await expect(
                new AssetRegistryService(testContext).validate({
                    assetType: "BOARD_V2",
                    configuration: "{}",
                    file: "request.json",
                    json: false,
                })
            ).rejects.toThrow("-f is mutually exclusive");
        });

        it("Should throw when no mode options are provided", async () => {
            await expect(
                new AssetRegistryService(testContext).validate({
                    assetType: "BOARD_V2",
                    json: false,
                })
            ).rejects.toThrow("Provide --packageKey with one of --nodeKey");
        });
    });
});
