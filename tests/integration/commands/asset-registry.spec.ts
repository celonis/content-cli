import Module = require("../../../src/commands/asset-registry/module");
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { CliRunResult, runCli as runCliProcess } from "../../utls/cli-runner";
import { GracefulError } from "../../../src/core/utils/logger";

jest.mock("../../../src/commands/asset-registry/asset-registry.service");

describe("asset-registry command integration", () => {
    let mockService: jest.Mocked<AssetRegistryService>;

    beforeEach(() => {
        mockService = {
            listTypes: jest.fn().mockResolvedValue(undefined),
            getType: jest.fn().mockResolvedValue(undefined),
            getSchema: jest.fn().mockResolvedValue(undefined),
            getExamples: jest.fn().mockResolvedValue(undefined),
        } as any;

        (AssetRegistryService as jest.MockedClass<typeof AssetRegistryService>)
            .mockImplementation(() => mockService);
    });

    async function runCli(args: string[]): Promise<CliRunResult> {
        return runCliProcess(args, [Module]);
    }

    describe("asset-registry schema", () => {
        it("calls getSchema with --json", async () => {
            const result = await runCli(["asset-registry", "schema", "--assetType", "BOARD_V2", "--json"]);

            expect(result.exitCode).toBe(0);
            expect(mockService.getSchema).toHaveBeenCalledWith("BOARD_V2", true);
        });

        it("defaults --json to false when omitted", async () => {
            await runCli(["asset-registry", "schema", "--assetType", "BOARD_V2"]);
            expect(mockService.getSchema).toHaveBeenCalledWith("BOARD_V2", false);
        });
    });

    describe("asset-registry validate", () => {
        it("no longer exists and exits non-zero", async () => {
            const result = await runCli([
                "asset-registry", "validate",
                "--assetType", "BOARD_V2",
                "--packageKey", "my-pkg",
                "--nodeKey", "my-view",
            ]);

            expect(result.exitCode).not.toBe(0);
        });
    });

    describe("asset-registry examples", () => {
        it("calls getExamples without --json", async () => {
            const result = await runCli(["asset-registry", "examples", "--assetType", "BOARD_V2"]);

            expect(result.exitCode).toBe(0);
            expect(mockService.getExamples).toHaveBeenCalledWith("BOARD_V2", false);
        });

        it("calls getExamples with --json", async () => {
            await runCli(["asset-registry", "examples", "--assetType", "BOARD_V2", "--json"]);
            expect(mockService.getExamples).toHaveBeenCalledWith("BOARD_V2", true);
        });
    });

    describe("asset-registry list", () => {
        it("calls listTypes with --json", async () => {
            const result = await runCli(["asset-registry", "list", "--json"]);

            expect(result.exitCode).toBe(0);
            expect(mockService.listTypes).toHaveBeenCalledWith(true);
        });

        it("calls listTypes without --json", async () => {
            await runCli(["asset-registry", "list"]);
            expect(mockService.listTypes).toHaveBeenCalledWith(false);
        });
    });

    describe("asset-registry get", () => {
        it("calls getType with the requested assetType", async () => {
            const result = await runCli(["asset-registry", "get", "--assetType", "BOARD_V2"]);

            expect(result.exitCode).toBe(0);
            expect(mockService.getType).toHaveBeenCalledWith("BOARD_V2", false);
        });

        it("calls getType with --json", async () => {
            await runCli(["asset-registry", "get", "--assetType", "BOARD_V2", "--json"]);
            expect(mockService.getType).toHaveBeenCalledWith("BOARD_V2", true);
        });
    });

    describe("exit codes", () => {
        it("exits non-zero and reports the error when the service fails", async () => {
            mockService.listTypes.mockRejectedValueOnce(new Error("Asset registry feature is disabled"));

            const result = await runCli(["asset-registry", "list"]);

            expect(result.exitCode).toBe(1);
            expect(result.output).toContain("Asset registry feature is disabled");
        });

        it("exits with code 0 when the service raises a GracefulError", async () => {
            mockService.listTypes.mockRejectedValueOnce(new GracefulError("Nothing to list"));

            const result = await runCli(["asset-registry", "list"]);

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain("Nothing to list");
        });

        it("exits non-zero for an unknown command", async () => {
            const result = await runCli(["this-command-does-not-exist"]);

            expect(result.exitCode).not.toBe(0);
            expect(mockService.listTypes).not.toHaveBeenCalled();
        });

        it("exits non-zero when a required option is missing", async () => {
            const result = await runCli(["asset-registry", "get"]);

            expect(result.exitCode).not.toBe(0);
            expect(mockService.getType).not.toHaveBeenCalled();
        });
    });
});
