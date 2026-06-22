import Module = require("../../../src/commands/asset-registry/module");
import { Command } from "commander";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { buildTestProgram } from "../../utls/cli-program";
import { runCli as runCliProcess } from "../../utls/cli-runner";

jest.mock("../../../src/commands/asset-registry/asset-registry.service");

describe("asset-registry command integration", () => {
    let program: Command;
    let mockService: jest.Mocked<AssetRegistryService>;

    beforeEach(() => {
        mockService = {
            listTypes: jest.fn().mockResolvedValue(undefined),
            listSkills: jest.fn().mockResolvedValue(undefined),
            getType: jest.fn().mockResolvedValue(undefined),
            getSchema: jest.fn().mockResolvedValue(undefined),
            validate: jest.fn().mockResolvedValue(undefined),
            getExamples: jest.fn().mockResolvedValue(undefined),
        } as any;

        (AssetRegistryService as jest.MockedClass<typeof AssetRegistryService>)
            .mockImplementation(() => mockService);

        program = buildTestProgram([Module]);
    });

    function runCli(args: string[]): Promise<Command> {
        return program.parseAsync(["node", "content-cli", ...args]);
    }

    describe("asset-registry schema", () => {
        it("calls getSchema with --json", async () => {
            await runCli(["asset-registry", "schema", "--assetType", "BOARD_V2", "--json"]);
            expect(mockService.getSchema).toHaveBeenCalledWith("BOARD_V2", true);
        });

        it("defaults --json to false when omitted", async () => {
            await runCli(["asset-registry", "schema", "--assetType", "BOARD_V2"]);
            expect(mockService.getSchema).toHaveBeenCalledWith("BOARD_V2", false);
        });

        it("writes schema output to stdout and exits with code 0", async () => {
            mockService.getSchema.mockImplementationOnce(async () => {
                process.stdout.write("{\"type\":\"object\"}\n");
            });

            const result = await runCliProcess(["asset-registry", "schema", "--assetType", "BOARD_V2"], [Module]);

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain("\"type\":\"object\"");
        });
    });

    describe("asset-registry validate", () => {
        it("forwards --configuration sub-mode options", async () => {
            await runCli([
                "asset-registry", "validate",
                "--assetType", "BOARD_V2",
                "--packageKey", "my-pkg",
                "--configuration", '{"components":[]}',
                "--json",
            ]);
            expect(mockService.validate).toHaveBeenCalledWith({
                assetType: "BOARD_V2",
                packageKey: "my-pkg",
                nodeKey: undefined,
                configuration: '{"components":[]}',
                file: undefined,
                json: true,
            });
        });

        it("forwards --nodeKey sub-mode options", async () => {
            await runCli([
                "asset-registry", "validate",
                "--assetType", "BOARD_V2",
                "--packageKey", "my-pkg",
                "--nodeKey", "my-view",
            ]);
            expect(mockService.validate).toHaveBeenCalledWith({
                assetType: "BOARD_V2",
                packageKey: "my-pkg",
                nodeKey: "my-view",
                configuration: undefined,
                file: undefined,
                json: false,
            });
        });

        it("forwards --file mode options", async () => {
            await runCli([
                "asset-registry", "validate",
                "--assetType", "BOARD_V2",
                "--file", "request.json",
            ]);
            expect(mockService.validate).toHaveBeenCalledWith({
                assetType: "BOARD_V2",
                packageKey: undefined,
                nodeKey: undefined,
                configuration: undefined,
                file: "request.json",
                json: false,
            });
        });
    });

    describe("asset-registry examples", () => {
        it("calls getExamples without --json", async () => {
            await runCli(["asset-registry", "examples", "--assetType", "BOARD_V2"]);
            expect(mockService.getExamples).toHaveBeenCalledWith("BOARD_V2", false);
        });

        it("calls getExamples with --json", async () => {
            await runCli(["asset-registry", "examples", "--assetType", "BOARD_V2", "--json"]);
            expect(mockService.getExamples).toHaveBeenCalledWith("BOARD_V2", true);
        });

        it("writes examples output to stdout and exits with code 0", async () => {
            mockService.getExamples.mockImplementationOnce(async () => {
                process.stdout.write("[{\"name\":\"simple-view\"}]\n");
            });

            const result = await runCliProcess(["asset-registry", "examples", "--assetType", "BOARD_V2"], [Module]);

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain("simple-view");
        });
    });

    describe("asset-registry list", () => {
        it("calls listTypes with --json", async () => {
            await runCli(["asset-registry", "list", "--json"]);
            expect(mockService.listTypes).toHaveBeenCalledWith(true);
        });

        it("calls listTypes without --json", async () => {
            await runCli(["asset-registry", "list"]);
            expect(mockService.listTypes).toHaveBeenCalledWith(false);
        });
    });

    describe("asset-registry skills list", () => {
        it("calls listSkills with --json", async () => {
            await runCli(["asset-registry", "skills", "list", "--json"]);
            expect(mockService.listSkills).toHaveBeenCalledWith(true);
        });

        it("calls listSkills without --json", async () => {
            await runCli(["asset-registry", "skills", "list"]);
            expect(mockService.listSkills).toHaveBeenCalledWith(false);
        });
    });

    describe("asset-registry get", () => {
        it("calls getType with the requested assetType", async () => {
            await runCli(["asset-registry", "get", "--assetType", "BOARD_V2"]);
            expect(mockService.getType).toHaveBeenCalledWith("BOARD_V2", false);
        });

        it("calls getType with --json", async () => {
            await runCli(["asset-registry", "get", "--assetType", "BOARD_V2", "--json"]);
            expect(mockService.getType).toHaveBeenCalledWith("BOARD_V2", true);
        });
    });
});
