import Module = require("../../../src/commands/asset-registry/module");
import { Command, OptionValues } from "commander";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";
import { createMockConfigurator } from "../../utls/configurator-mock";

jest.mock("../../../src/commands/asset-registry/asset-registry.service");

describe("Asset Registry Module", () => {
    let module: Module;
    let mockCommand: Command;
    let mockService: jest.Mocked<AssetRegistryService>;

    beforeEach(() => {
        jest.clearAllMocks();
        module = new Module();
        mockCommand = {} as Command;

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
    });

    it("should call getSchema with correct parameters", async () => {
        const options: OptionValues = { assetType: "BOARD_V2", json: true };
        await (module as any).getSchema(testContext, mockCommand, options);
        expect(mockService.getSchema).toHaveBeenCalledWith("BOARD_V2", true);
    });

    it("should call validate with --configuration sub-mode options", async () => {
        const options: OptionValues = {
            assetType: "BOARD_V2",
            packageKey: "my-pkg",
            configuration: '{"components":[]}',
            json: true,
        };
        await (module as any).validate(testContext, mockCommand, options);
        expect(mockService.validate).toHaveBeenCalledWith({
            assetType: "BOARD_V2",
            packageKey: "my-pkg",
            nodeKey: undefined,
            configuration: '{"components":[]}',
            file: undefined,
            json: true,
        });
    });

    it("should call validate with --nodeKey sub-mode options", async () => {
        const options: OptionValues = {
            assetType: "BOARD_V2",
            packageKey: "my-pkg",
            nodeKey: "my-view",
            json: "",
        };
        await (module as any).validate(testContext, mockCommand, options);
        expect(mockService.validate).toHaveBeenCalledWith({
            assetType: "BOARD_V2",
            packageKey: "my-pkg",
            nodeKey: "my-view",
            configuration: undefined,
            file: undefined,
            json: false,
        });
    });

    it("should call validate with file mode options", async () => {
        const options: OptionValues = {
            assetType: "BOARD_V2",
            file: "request.json",
            json: "",
        };
        await (module as any).validate(testContext, mockCommand, options);
        expect(mockService.validate).toHaveBeenCalledWith({
            assetType: "BOARD_V2",
            packageKey: undefined,
            nodeKey: undefined,
            configuration: undefined,
            file: "request.json",
            json: false,
        });
    });

    it("should call getExamples with correct parameters", async () => {
        const options: OptionValues = { assetType: "BOARD_V2", json: "" };
        await (module as any).getExamples(testContext, mockCommand, options);
        expect(mockService.getExamples).toHaveBeenCalledWith("BOARD_V2", false);
    });

    it("should call listTypes", async () => {
        const options: OptionValues = { json: true };
        await (module as any).listTypes(testContext, mockCommand, options);
        expect(mockService.listTypes).toHaveBeenCalledWith(true);
    });

    it("should call listSkills", async () => {
        const options: OptionValues = { json: true };
        await (module as any).listSkills(testContext, mockCommand, options);
        expect(mockService.listSkills).toHaveBeenCalledWith(true);

        jest.clearAllMocks();
        const optionsNoJson: OptionValues = { json: "" };
        await (module as any).listSkills(testContext, mockCommand, optionsNoJson);
        expect(mockService.listSkills).toHaveBeenCalledWith(false);
    });

    it("should call getType", async () => {
        const options: OptionValues = { assetType: "BOARD_V2", json: "" };
        await (module as any).getType(testContext, mockCommand, options);
        expect(mockService.getType).toHaveBeenCalledWith("BOARD_V2", false);
    });

    describe("register", () => {
        it("registers all expected command groups without throwing", () => {
            const mockConfigurator = createMockConfigurator();

            expect(() => new Module().register(testContext, mockConfigurator)).not.toThrow();

            expect(mockConfigurator.command).toHaveBeenCalledWith("asset-registry");
            expect(mockConfigurator.command).toHaveBeenCalledWith("skills");
            expect(mockConfigurator.command).toHaveBeenCalledWith("list");
            expect(mockConfigurator.command).toHaveBeenCalledWith("get");
            expect(mockConfigurator.command).toHaveBeenCalledWith("schema");
            expect(mockConfigurator.command).toHaveBeenCalledWith("examples");
            expect(mockConfigurator.command).toHaveBeenCalledWith("validate");
        });

        it("wires an action handler for every leaf subcommand", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            // Each leaf command terminates the fluent chain with .action(handler).
            // Keep this count in sync when adding or removing commands in module.ts.
            const expectedLeafCommands = 6;
            expect(mockConfigurator.action).toHaveBeenCalledTimes(expectedLeafCommands);
            for (const call of mockConfigurator.action.mock.calls) {
                expect(typeof call[0]).toBe("function");
            }
        });
    });
});
