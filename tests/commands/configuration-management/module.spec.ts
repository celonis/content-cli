import Module = require("../../../src/commands/configuration-management/module");
import {Command, OptionValues} from "commander";
import {ConfigCommandService} from "../../../src/commands/configuration-management/config-command.service";
import {NodeDependencyService} from "../../../src/commands/configuration-management/node-dependency.service";
import {testContext} from "../../utls/test-context";

jest.mock("../../../src/commands/configuration-management/config-command.service");
jest.mock("../../../src/commands/configuration-management/node-dependency.service");

describe("Configuration Management Module - Action Validations", () => {
    let module: Module;
    let mockCommand: Command;
    let mockConfigCommandService: jest.Mocked<ConfigCommandService>;
    let mockNodeDependencyService: jest.Mocked<NodeDependencyService>;

    beforeEach(() => {
        jest.clearAllMocks();
        module = new Module();
        mockCommand = {} as Command;

        mockConfigCommandService = {
            batchExportPackages: jest.fn().mockResolvedValue(undefined),
            batchImportPackages: jest.fn().mockResolvedValue(undefined),
        } as any;

        mockNodeDependencyService = {
            listNodeDependencies: jest.fn().mockResolvedValue(undefined),
        } as any;

        (ConfigCommandService as jest.MockedClass<typeof ConfigCommandService>).mockImplementation(
            () => mockConfigCommandService
        );
        (NodeDependencyService as jest.MockedClass<typeof NodeDependencyService>).mockImplementation(
            () => mockNodeDependencyService
        );
    });

    describe("batchExportPackages validation", () => {
        describe("packageKeys and keysByVersion validation", () => {
            it("should throw error when both packageKeys and keysByVersion are provided", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1", "package2"],
                    keysByVersion: ["package3:v1", "package4:v2"],
                };

                await expect((module as any).batchExportPackages(testContext, mockCommand, options)).rejects.toThrow(
                    "Please provide either --packageKeys or --keysByVersion, but not both."
                );

                expect(mockConfigCommandService.batchExportPackages).not.toHaveBeenCalled();
            });

            it("should throw error when neither packageKeys nor keysByVersion are provided", async () => {
                const options: OptionValues = {};

                await expect((module as any).batchExportPackages(testContext, mockCommand, options)).rejects.toThrow(
                    "Please provide either --packageKeys or --keysByVersion, but not both."
                );

                expect(mockConfigCommandService.batchExportPackages).not.toHaveBeenCalled();
            });

            it("should pass validation when only packageKeys is provided", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1", "package2"],
                };

                await (module as any).batchExportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchExportPackages).toHaveBeenCalledWith(
                    ["package1", "package2"],
                    undefined,
                    false,
                    undefined,
                    undefined
                );
            });

            it("should pass validation when only keysByVersion is provided", async () => {
                const options: OptionValues = {
                    keysByVersion: ["package3:v1", "package4:v2"],
                };

                await (module as any).batchExportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchExportPackages).toHaveBeenCalledWith(
                    undefined,
                    ["package3:v1", "package4:v2"],
                    false,
                    undefined,
                    undefined
                );
            });
        });

        describe("gitProfile and gitBranch validation", () => {
            it("should throw error when gitProfile is provided without gitBranch option", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1"],
                    gitProfile: "myProfile",
                };

                await expect((module as any).batchExportPackages(testContext, mockCommand, options)).rejects.toThrow(
                    "Please specify a branch using --gitBranch when using a Git profile."
                );

                expect(mockConfigCommandService.batchExportPackages).not.toHaveBeenCalled();
            });

            it("should pass validation when gitProfile provided with gitBranch option", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1"],
                    gitBranch: "main",
                    gitProfile: "myProfile",
                };

                await (module as any).batchExportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchExportPackages).toHaveBeenCalledWith(
                    ["package1"],
                    undefined,
                    false,
                    "main",
                    undefined
                );
            });

            it("should pass validation when gitBranch is provided without gitProfile in context", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1"],
                    gitBranch: "main",
                };

                await (module as any).batchExportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchExportPackages).toHaveBeenCalledWith(
                    ["package1"],
                    undefined,
                    false,
                    "main",
                    undefined
                );
            });

            it("should pass validation when neither gitProfile in context nor gitBranch in options are provided", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1"],
                };

                await (module as any).batchExportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchExportPackages).toHaveBeenCalled();
            });
        });

        describe("withDependencies option", () => {
            it("should default withDependencies to false when not provided", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1"],
                };

                await (module as any).batchExportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchExportPackages).toHaveBeenCalledWith(
                    ["package1"],
                    undefined,
                    false,
                    undefined,
                    undefined
                );
            });

            it("should pass withDependencies as true when provided", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1"],
                    withDependencies: true,
                };

                await (module as any).batchExportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchExportPackages).toHaveBeenCalledWith(
                    ["package1"],
                    undefined,
                    true,
                    undefined,
                    undefined
                );
            });

            it("should pass unzip option when provided", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1"],
                    unzip: true,
                };

                await (module as any).batchExportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchExportPackages).toHaveBeenCalledWith(
                    ["package1"],
                    undefined,
                    false,
                    undefined,
                    true
                );
            });
        });

        describe("combined validation scenarios", () => {
            it("should fail on first validation error (packageKeys conflict) before checking gitProfile", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1"],
                    keysByVersion: ["package2:v1"],
                    gitProfile: "myProfile",
                };

                await expect((module as any).batchExportPackages(testContext, mockCommand, options)).rejects.toThrow(
                    "Please provide either --packageKeys or --keysByVersion, but not both."
                );

                expect(mockConfigCommandService.batchExportPackages).not.toHaveBeenCalled();
            });
        });
    });

    describe("batchImportPackages validation", () => {
        describe("gitProfile and gitBranch validation", () => {
            it("should throw error when gitProfile is provided without gitBranch option", async () => {
                const options: OptionValues = {
                    file: "export.zip",
                    gitProfile: "myProfile",
                };

                await expect((module as any).batchImportPackages(testContext, mockCommand, options)).rejects.toThrow(
                    "Please specify a branch using --gitBranch when using a Git profile."
                );

                expect(mockConfigCommandService.batchImportPackages).not.toHaveBeenCalled();
            });

            it("should pass validation when gitProfile is provided with gitBranch option", async () => {
                const options: OptionValues = {
                    file: "export.zip",
                    gitBranch: "main",
                    gitProfile: "myProfile",
                };

                await (module as any).batchImportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchImportPackages).toHaveBeenCalledWith(
                    "export.zip",
                    undefined,
                    undefined,
                    "main"
                );
            });

            it("should pass validation when gitBranch is provided without gitProfile in context", async () => {
                const options: OptionValues = {
                    directory: "./exported",
                    gitBranch: "develop",
                };

                await (module as any).batchImportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchImportPackages).toHaveBeenCalledWith(
                    undefined,
                    "./exported",
                    undefined,
                    "develop"
                );
            });

            it("should pass validation when neither gitProfile in context nor gitBranch in options are provided", async () => {
                const options: OptionValues = {
                    file: "export.zip",
                };

                await (module as any).batchImportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchImportPackages).toHaveBeenCalledWith(
                    "export.zip",
                    undefined,
                    undefined,
                    undefined
                );
            });
        });

        describe("import options", () => {
            it("should pass file option correctly", async () => {
                const options: OptionValues = {
                    file: "my-export.zip",
                };

                await (module as any).batchImportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchImportPackages).toHaveBeenCalledWith(
                    "my-export.zip",
                    undefined,
                    undefined,
                    undefined
                );
            });

            it("should pass directory option correctly", async () => {
                const options: OptionValues = {
                    directory: "./my-exports",
                };

                await (module as any).batchImportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchImportPackages).toHaveBeenCalledWith(
                    undefined,
                    "./my-exports",
                    undefined,
                    undefined
                );
            });

            it("should pass overwrite option correctly", async () => {
                const options: OptionValues = {
                    file: "export.zip",
                    overwrite: true,
                };

                await (module as any).batchImportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchImportPackages).toHaveBeenCalledWith(
                    "export.zip",
                    undefined,
                    true,
                    undefined
                );
            });

            it("should handle all options together", async () => {
                const options: OptionValues = {
                    directory: "./exports",
                    overwrite: true,
                    gitBranch: "feature-branch",
                };

                await (module as any).batchImportPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.batchImportPackages).toHaveBeenCalledWith(
                    undefined,
                    "./exports",
                    true,
                    "feature-branch"
                );
            });
        });
    });

    describe("listNodeDependencies", () => {
        it("should call listNodeDependencies with correct parameters", async () => {
            const options: OptionValues = {
                packageKey: "test-package",
                nodeKey: "test-node",
                packageVersion: "1.0.0",
            };

            await (module as any).listNodeDependencies(testContext, mockCommand, options);

            expect(mockNodeDependencyService.listNodeDependencies).toHaveBeenCalledWith(
                "test-package",
                "test-node",
                "1.0.0",
                undefined
            );
        });

        it("should pass json option when provided", async () => {
            const options: OptionValues = {
                packageKey: "test-package",
                nodeKey: "test-node",
                packageVersion: "2.0.0",
                json: true,
            };

            await (module as any).listNodeDependencies(testContext, mockCommand, options);

            expect(mockNodeDependencyService.listNodeDependencies).toHaveBeenCalledWith(
                "test-package",
                "test-node",
                "2.0.0",
                true
            );
        });

        it("should handle different package versions", async () => {
            const options: OptionValues = {
                packageKey: "production-package",
                nodeKey: "production-node",
                packageVersion: "3.5.2",
                json: false,
            };

            await (module as any).listNodeDependencies(testContext, mockCommand, options);

            expect(mockNodeDependencyService.listNodeDependencies).toHaveBeenCalledWith(
                "production-package",
                "production-node",
                "3.5.2",
                false
            );
        });

        it("should handle all parameters correctly", async () => {
            const options: OptionValues = {
                packageKey: "my-package",
                nodeKey: "my-node",
                packageVersion: "1.2.3",
                json: true,
            };

            await (module as any).listNodeDependencies(testContext, mockCommand, options);

            expect(mockNodeDependencyService.listNodeDependencies).toHaveBeenCalledTimes(1);
            expect(mockNodeDependencyService.listNodeDependencies).toHaveBeenCalledWith(
                "my-package",
                "my-node",
                "1.2.3",
                true
            );
        });
    });
});
