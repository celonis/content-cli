import Module = require("../../../src/commands/t2tc/module");
import { Command, OptionValues } from "commander";
import { T2tcCommandService } from "../../../src/commands/t2tc/t2tc-command.service";
import { testContext } from "../../utls/test-context";
import { createMockConfigurator } from "../../utls/configurator-mock";

jest.mock("../../../src/commands/t2tc/t2tc-command.service");

describe("T2TC Module", () => {
    let module: Module;
    let mockCommand: Command;
    let mockT2tcCommandService: jest.Mocked<T2tcCommandService>;

    beforeEach(() => {
        jest.clearAllMocks();
        module = new Module();
        mockCommand = {} as Command;

        mockT2tcCommandService = {
            listPackages: jest.fn().mockResolvedValue(undefined),
            batchExportPackages: jest.fn().mockResolvedValue(undefined),
            batchImportPackages: jest.fn().mockResolvedValue(undefined),
            diffPackages: jest.fn().mockResolvedValue(undefined),
        } as any;

        (T2tcCommandService as jest.MockedClass<typeof T2tcCommandService>).mockImplementation(() => mockT2tcCommandService);
    });

    describe("register", () => {
        it("registers the t2tc and package command groups without throwing", () => {
            const mockConfigurator = createMockConfigurator();

            expect(() => new Module().register(testContext, mockConfigurator)).not.toThrow();

            expect(mockConfigurator.command).toHaveBeenCalledWith("t2tc");
            expect(mockConfigurator.command).toHaveBeenCalledWith("package");
            expect(mockConfigurator.command).toHaveBeenCalledWith("list");
            expect(mockConfigurator.command).toHaveBeenCalledWith("export");
            expect(mockConfigurator.command).toHaveBeenCalledWith("import");
            expect(mockConfigurator.command).toHaveBeenCalledWith("diff");
        });

        it("wires an action handler for every leaf subcommand", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            // t2tc package list / export / import / diff
            const expectedLeafCommands = 4;
            expect(mockConfigurator.action).toHaveBeenCalledTimes(expectedLeafCommands);
            for (const call of mockConfigurator.action.mock.calls) {
                expect(typeof call[0]).toBe("function");
            }
        });
    });

    describe("listPackages", () => {
        it("throws when both --packageKeys and --keysByVersion are provided", async () => {
            const options: OptionValues = {
                packageKeys: ["package1"],
                keysByVersion: ["package2.1.0.0"],
            };

            await expect(
                (module as any).listPackages(testContext, mockCommand, options)
            ).rejects.toThrow("Please provide either --packageKeys or --keysByVersion, but not both.");

            expect(mockT2tcCommandService.listPackages).not.toHaveBeenCalled();
        });

        it("throws when --staging is combined with an incompatible filter", async () => {
            const options: OptionValues = {
                staging: true,
                packageKeys: ["package1"],
            };

            await expect(
                (module as any).listPackages(testContext, mockCommand, options)
            ).rejects.toThrow("Staging parameter is not compatible with");

            expect(mockT2tcCommandService.listPackages).not.toHaveBeenCalled();
        });

        it("delegates to T2tcCommandService with the provided options", async () => {
            const options: OptionValues = {
                json: true,
                flavors: ["STUDIO"],
                packageKeys: ["package1"],
            };

            await (module as any).listPackages(testContext, mockCommand, options);

            expect(mockT2tcCommandService.listPackages).toHaveBeenCalledWith(
                true,
                ["STUDIO"],
                undefined,
                ["package1"],
                undefined,
                undefined,
                undefined,
                undefined,
                undefined
            );
        });
    });

    describe("batchExportPackages", () => {
        it("throws when both --packageKeys and --keysByVersion are provided", async () => {
            const options: OptionValues = {
                packageKeys: ["package1"],
                keysByVersion: ["package2.1.0.0"],
            };

            await expect(
                (module as any).batchExportPackages(testContext, mockCommand, options)
            ).rejects.toThrow("Please provide either --packageKeys or --keysByVersion, but not both.");

            expect(mockT2tcCommandService.batchExportPackages).not.toHaveBeenCalled();
        });

        it("throws when neither --packageKeys nor --keysByVersion is provided", async () => {
            const options: OptionValues = {};

            await expect(
                (module as any).batchExportPackages(testContext, mockCommand, options)
            ).rejects.toThrow("Please provide either --packageKeys or --keysByVersion, but not both.");

            expect(mockT2tcCommandService.batchExportPackages).not.toHaveBeenCalled();
        });

        it("throws when a Git profile is provided without a Git branch", async () => {
            const options: OptionValues = {
                packageKeys: ["package1"],
                gitProfile: "my-git-profile",
            };

            await expect(
                (module as any).batchExportPackages(testContext, mockCommand, options)
            ).rejects.toThrow("Please specify a branch using --gitBranch when using a Git profile.");

            expect(mockT2tcCommandService.batchExportPackages).not.toHaveBeenCalled();
        });

        it("delegates to T2tcCommandService and defaults withDependencies to false", async () => {
            const options: OptionValues = {
                packageKeys: ["package1"],
                unzip: true,
            };

            await (module as any).batchExportPackages(testContext, mockCommand, options);

            expect(mockT2tcCommandService.batchExportPackages).toHaveBeenCalledWith(
                ["package1"],
                undefined,
                false,
                undefined,
                true
            );
        });
    });

    describe("batchImportPackages", () => {
        it("throws when a Git profile is provided without a Git branch", async () => {
            const options: OptionValues = {
                gitProfile: "my-git-profile",
            };

            await expect(
                (module as any).batchImportPackages(testContext, mockCommand, options)
            ).rejects.toThrow("Please specify a branch using --gitBranch when using a Git profile.");

            expect(mockT2tcCommandService.batchImportPackages).not.toHaveBeenCalled();
        });

        it("delegates to T2tcCommandService with the provided options", async () => {
            const options: OptionValues = {
                file: "export.zip",
                overwrite: true,
                validate: true,
            };

            await (module as any).batchImportPackages(testContext, mockCommand, options);

            expect(mockT2tcCommandService.batchImportPackages).toHaveBeenCalledWith(
                "export.zip",
                undefined,
                true,
                undefined,
                true
            );
        });
    });

    describe("diffPackages", () => {
        it("delegates to T2tcCommandService with the provided options", async () => {
            const options: OptionValues = {
                file: "export.zip",
                hasChanges: true,
                baseVersion: "STAGING",
                json: true,
            };

            await (module as any).diffPackages(testContext, mockCommand, options);

            expect(mockT2tcCommandService.diffPackages).toHaveBeenCalledWith(
                "export.zip",
                true,
                "STAGING",
                true
            );
        });
    });
});
