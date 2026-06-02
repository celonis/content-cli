import Module = require("../../../src/commands/configuration-management/module");
import { Command, OptionValues } from "commander";
import { ConfigCommandService } from "../../../src/commands/configuration-management/config-command.service";
import { NodeDependencyService } from "../../../src/commands/configuration-management/node-dependency.service";
import { PackageVersionCommandService } from "../../../src/commands/configuration-management/package-version-command.service";
import { NodeDiffService } from "../../../src/commands/configuration-management/node-diff.service";
import { testContext } from "../../utls/test-context";
import { createMockConfigurator } from "../../utls/configurator-mock";

jest.mock("../../../src/commands/configuration-management/config-command.service");
jest.mock("../../../src/commands/configuration-management/node-dependency.service");
jest.mock("../../../src/commands/configuration-management/node-diff.service");
jest.mock("../../../src/commands/configuration-management/package-version-command.service");

/** Mirrors default values on `config variables list` Commander options (keep in sync with module.ts). */
const variablesListOptionDefaults: OptionValues = {
    packageKeys: [],
    keysByVersion: [],
    keysByVersionFile: "",
};

describe("Configuration Management Module - Action Validations", () => {
    let module: Module;
    let mockCommand: Command;
    let mockConfigCommandService: jest.Mocked<ConfigCommandService>;
    let mockNodeDependencyService: jest.Mocked<NodeDependencyService>;
    let mockNodeDiffService: jest.Mocked<NodeDiffService>;

    beforeEach(() => {
        jest.clearAllMocks();
        module = new Module();
        mockCommand = {} as Command;

        mockConfigCommandService = {
            listPackages: jest.fn().mockResolvedValue(undefined),
            listVariables: jest.fn().mockResolvedValue(undefined),
            batchExportPackages: jest.fn().mockResolvedValue(undefined),
            batchImportPackages: jest.fn().mockResolvedValue(undefined),
            diffPackages: jest.fn().mockResolvedValue(undefined),
        } as any;

        mockNodeDependencyService = {
            listNodeDependencies: jest.fn().mockResolvedValue(undefined),
        } as any;

        mockNodeDiffService = {
            diff: jest.fn().mockResolvedValue(undefined),
            diffWithFile: jest.fn().mockResolvedValue(undefined),
        } as any;

        (ConfigCommandService as jest.MockedClass<typeof ConfigCommandService>).mockImplementation(() => mockConfigCommandService);
        (NodeDependencyService as jest.MockedClass<typeof NodeDependencyService>).mockImplementation(() => mockNodeDependencyService);
        (NodeDiffService as jest.MockedClass<typeof NodeDiffService>).mockImplementation(() => mockNodeDiffService);
    });

    describe("listActivePackages validation", () => {
        describe("packageKeys and keysByVersion validation", () => {
            it("should throw error when both packageKeys and keysByVersion are provided", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1", "package2"],
                    keysByVersion: ["package3.1.0.0", "package4.1.0.0"],
                };

                await expect(
                    (module as any).listPackages(testContext, mockCommand, options)
                ).rejects.toThrow("Please provide either --packageKeys or --keysByVersion, but not both.");

                expect(mockConfigCommandService.listPackages).not.toHaveBeenCalled();
            });

            it("should pass validation when only packageKeys is provided", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1", "package2"],
                    json: true,
                };

                await (module as any).listPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.listPackages).toHaveBeenCalledWith(
                    true,
                    undefined,
                    undefined,
                    ["package1", "package2"],
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined
                );
            });

            it("should pass validation when only keysByVersion is provided", async () => {
                const options: OptionValues = {
                    keysByVersion: ["package3.1.0.0", "package4.1.0.0"],
                    json: true,
                };

                await (module as any).listPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.listPackages).toHaveBeenCalledWith(
                    true,
                    undefined,
                    undefined,
                    undefined,
                    ["package3.1.0.0", "package4.1.0.0"],
                    undefined,
                    undefined,
                    undefined,
                    undefined
                );
            });
        });
        describe("branches validation", () => {
            it("should pass validation when branches is provided", async () => {
                const options: OptionValues = {
                    branches: true,
                    json: true,
                };

                await (module as any).listPackages(testContext, mockCommand, options);

                expect(mockConfigCommandService.listPackages).toHaveBeenCalledWith(
                    true,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    true,
                    undefined
                );
            });
        });
    });

    describe("listStagingPackages validation", () => {
        it("should pass validation when branches is provided", async () => {
            const options: OptionValues = {
                branches: true,
                json: true,
                staging: true,
            };

            await (module as any).listPackages(testContext, mockCommand, options);

            expect(mockConfigCommandService.listPackages).toHaveBeenCalledWith(
                true,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                true,
                true
            );
        });

        it("should throw error when packageKeys is provided", async () => {
            const options: OptionValues = {
                packageKeys: ["package1", "package2"],
                staging: true,
            };

            await expect(
                (module as any).listPackages(testContext, mockCommand, options)
            ).rejects.toThrow("Staging parameter is not compatible with --withDependencies, --packageKeys, --keysByVersion, --variableValue, --variableType");
        });

        it("should throw error when withDependencies is provided", async () => {
            const options: OptionValues = {
                withDependencies: true,
                staging: true,
            };

            await expect(
                (module as any).listPackages(testContext, mockCommand, options)
            ).rejects.toThrow("Staging parameter is not compatible with --withDependencies, --packageKeys, --keysByVersion, --variableValue, --variableType");
        });

        it("should throw error when keysByVersion is provided", async () => {
            const options: OptionValues = {
                keysByVersion: ["package3.1.0.0", "package4.1.0.0"],
                staging: true,
            };

            await expect(
                (module as any).listPackages(testContext, mockCommand, options)
            ).rejects.toThrow("Staging parameter is not compatible with --withDependencies, --packageKeys, --keysByVersion, --variableValue, --variableType");
        });

        it("should throw error when variableValue is provided", async () => {
            const options: OptionValues = {
                variableValue: "myValue",
                staging: true,
            };

            await expect(
                (module as any).listPackages(testContext, mockCommand, options)
            ).rejects.toThrow("Staging parameter is not compatible with --withDependencies, --packageKeys, --keysByVersion, --variableValue, --variableType");
        });

        it("should throw error when variableType is provided", async () => {
            const options: OptionValues = {
                variableType: "myType",
                staging: true,
            };

            await expect(
                (module as any).listPackages(testContext, mockCommand, options)
            ).rejects.toThrow("Staging parameter is not compatible with --withDependencies, --packageKeys, --keysByVersion, --variableValue, --variableType");
        });
    });

    describe("batchExportPackages validation", () => {
        describe("packageKeys and keysByVersion validation", () => {
            it("should throw error when both packageKeys and keysByVersion are provided", async () => {
                const options: OptionValues = {
                    packageKeys: ["package1", "package2"],
                    keysByVersion: ["package3:v1", "package4:v2"],
                };

                await expect(
                    (module as any).batchExportPackages(testContext, mockCommand, options)
                ).rejects.toThrow("Please provide either --packageKeys or --keysByVersion, but not both.");

                expect(mockConfigCommandService.batchExportPackages).not.toHaveBeenCalled();
            });

            it("should throw error when neither packageKeys nor keysByVersion are provided", async () => {
                const options: OptionValues = {};

                await expect(
                    (module as any).batchExportPackages(testContext, mockCommand, options)
                ).rejects.toThrow("Please provide either --packageKeys or --keysByVersion, but not both.");

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

                await expect(
                    (module as any).batchExportPackages(testContext, mockCommand, options)
                ).rejects.toThrow("Please specify a branch using --gitBranch when using a Git profile.");

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

                await expect(
                    (module as any).batchExportPackages(testContext, mockCommand, options)
                ).rejects.toThrow("Please provide either --packageKeys or --keysByVersion, but not both.");

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

                await expect(
                    (module as any).batchImportPackages(testContext, mockCommand, options)
                ).rejects.toThrow("Please specify a branch using --gitBranch when using a Git profile.");

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
                    "main",
                    undefined
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
                    "develop",
                    undefined
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
                    undefined,
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
                    "feature-branch",
                    undefined
                );
            });
        });
    });

    describe("listVariables validation", () => {
        it("should throw when --packageKeys and --keysByVersion are both provided", async () => {
            const options: OptionValues = {
                ...variablesListOptionDefaults,
                packageKeys: ["pkg-a"],
                keysByVersion: ["key-1:1.0.0"],
            };

            await expect(
                (module as any).listVariables(testContext, mockCommand, options)
            ).rejects.toThrow(
                "Please provide either --packageKeys or --keysByVersion/--keysByVersionFile, but not both."
            );

            expect(mockConfigCommandService.listVariables).not.toHaveBeenCalled();
        });

        it("should throw when --packageKeys and --keysByVersionFile are both provided", async () => {
            const options: OptionValues = {
                ...variablesListOptionDefaults,
                packageKeys: ["pkg-a"],
                keysByVersionFile: "mapping.json",
            };

            await expect(
                (module as any).listVariables(testContext, mockCommand, options)
            ).rejects.toThrow(
                "Please provide either --packageKeys or --keysByVersion/--keysByVersionFile, but not both."
            );

            expect(mockConfigCommandService.listVariables).not.toHaveBeenCalled();
        });

        it("should throw when neither staging nor versioned inputs are provided", async () => {
            const options: OptionValues = {...variablesListOptionDefaults};

            await expect(
                (module as any).listVariables(testContext, mockCommand, options)
            ).rejects.toThrow(
                "Please provide --packageKeys for staging, or --keysByVersion / --keysByVersionFile for versioned packages."
            );

            expect(mockConfigCommandService.listVariables).not.toHaveBeenCalled();
        });

        it("should call listVariables for staging when only --packageKeys is provided", async () => {
            const options: OptionValues = {
                ...variablesListOptionDefaults,
                packageKeys: ["pkg-a", "pkg-b"],
                json: true,
            };

            await (module as any).listVariables(testContext, mockCommand, options);

            expect(mockConfigCommandService.listVariables).toHaveBeenCalledWith(
                true,
                [],
                "",
                ["pkg-a", "pkg-b"]
            );
        });

        it("should call listVariables for versioned when only --keysByVersion is provided", async () => {
            const options: OptionValues = {
                ...variablesListOptionDefaults,
                keysByVersion: ["k:v"],
                json: false,
            };

            await (module as any).listVariables(testContext, mockCommand, options);

            expect(mockConfigCommandService.listVariables).toHaveBeenCalledWith(
                false,
                ["k:v"],
                "",
                []
            );
        });
    });

    describe("createPackageVersion validation", () => {
        let mockPackageVersionCommandService: jest.Mocked<PackageVersionCommandService>;

        beforeEach(() => {
            mockPackageVersionCommandService = {
                createPackageVersion: jest.fn().mockResolvedValue(undefined),
            } as any;

            (PackageVersionCommandService as jest.MockedClass<typeof PackageVersionCommandService>).mockImplementation(() => mockPackageVersionCommandService);
        });

        it("should throw error when both --packageVersion and --versionBumpOption PATCH are provided", async () => {
            const options: OptionValues = {
                packageKey: "my-package",
                packageVersion: "1.2.0",
                versionBumpOption: "PATCH",
            };

            await expect(
                (module as any).createPackageVersion(testContext, mockCommand, options)
            ).rejects.toThrow("Please provide either --packageVersion or --versionBumpOption, but not both.");

            expect(mockPackageVersionCommandService.createPackageVersion).not.toHaveBeenCalled();
        });

        it("should throw error when neither --packageVersion nor --versionBumpOption PATCH are provided", async () => {
            const options: OptionValues = {
                packageKey: "my-package",
                versionBumpOption: "NONE",
            };

            await expect(
                (module as any).createPackageVersion(testContext, mockCommand, options)
            ).rejects.toThrow("Please provide either --packageVersion or --versionBumpOption PATCH.");

            expect(mockPackageVersionCommandService.createPackageVersion).not.toHaveBeenCalled();
        });

        it("should throw error when --packageVersion is missing and --versionBumpOption is not provided (defaults to NONE)", async () => {
            const options: OptionValues = {
                packageKey: "my-package",
            };

            await expect(
                (module as any).createPackageVersion(testContext, mockCommand, options)
            ).rejects.toThrow("Please provide either --packageVersion or --versionBumpOption PATCH.");

            expect(mockPackageVersionCommandService.createPackageVersion).not.toHaveBeenCalled();
        });

        it("should pass validation when only --packageVersion is provided", async () => {
            const options: OptionValues = {
                packageKey: "my-package",
                packageVersion: "1.2.0",
                versionBumpOption: "NONE",
                summaryOfChanges: "New features",
            };

            await (module as any).createPackageVersion(testContext, mockCommand, options);

            expect(mockPackageVersionCommandService.createPackageVersion).toHaveBeenCalledWith(
                "my-package",
                "1.2.0",
                "NONE",
                "New features",
                undefined,
                undefined,
            );
        });

        it("should pass validation when only --versionBumpOption PATCH is provided", async () => {
            const options: OptionValues = {
                packageKey: "my-package",
                versionBumpOption: "PATCH",
                summaryOfChanges: "Bug fixes",
            };

            await (module as any).createPackageVersion(testContext, mockCommand, options);

            expect(mockPackageVersionCommandService.createPackageVersion).toHaveBeenCalledWith(
                "my-package",
                undefined,
                "PATCH",
                "Bug fixes",
                undefined,
                undefined,
            );
        });
    });

    describe("register", () => {
        it("registers all expected top-level command groups without throwing", () => {
            const mockConfigurator = createMockConfigurator();

            expect(() => new Module().register(testContext, mockConfigurator)).not.toThrow();

            // Top-level groups attached to the root configurator
            expect(mockConfigurator.command).toHaveBeenCalledWith("config");
            expect(mockConfigurator.command).toHaveBeenCalledWith("list");
        });

        it("wires an action handler for every leaf subcommand", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            // Each leaf command terminates the fluent chain with .action(handler).
            // Keep this count in sync when adding or removing commands in module.ts.
            const expectedLeafCommands = 17;
            expect(mockConfigurator.action).toHaveBeenCalledTimes(expectedLeafCommands);
            for (const call of mockConfigurator.action.mock.calls) {
                expect(typeof call[0]).toBe("function");
            }
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

    describe("diffPackages", () => {
        it("should call diffPackages using minimal parameters", async () => {
            const options: OptionValues = {
                file: "package.zip",
            };

            await (module as any).diffPackages(testContext, mockCommand, options);

            expect(mockConfigCommandService.diffPackages).toHaveBeenCalledWith(
                "package.zip", undefined, undefined, undefined
            );
        });

        it("should pass json parameter", async () => {
            const options: OptionValues = {
                file: "package.zip",
                json: true,
            };

            await (module as any).diffPackages(testContext, mockCommand, options);

            expect(mockConfigCommandService.diffPackages).toHaveBeenCalledWith(
                "package.zip", undefined, undefined, true
            );
        });

        it("should pass hasChanges parameter", async () => {
            const options: OptionValues = {
                file: "package.zip",
                hasChanges: true,
            };

            await (module as any).diffPackages(testContext, mockCommand, options);

            expect(mockConfigCommandService.diffPackages).toHaveBeenCalledWith(
                "package.zip", true, undefined, undefined
            );
        });

        it("should pass baseVersion parameter", async () => {
            const options: OptionValues = {
                file: "package.zip",
                baseVersion: "1.0.0",
            };

            await (module as any).diffPackages(testContext, mockCommand, options);

            expect(mockConfigCommandService.diffPackages).toHaveBeenCalledWith(
                "package.zip", undefined, "1.0.0", undefined
            );
        });

        it("should pass both parameters when hasChanges and baseVersion are used together", async () => {
            const options: OptionValues = {
                file: "package.zip",
                hasChanges: true,
                baseVersion: "STAGING"
            };

            await (module as any).diffPackages(testContext, mockCommand, options);

            expect(mockConfigCommandService.diffPackages).toHaveBeenCalledWith(
                "package.zip", true, "STAGING", undefined
            );
        });
    });

    describe("diffNode validation", () => {
        it("should throw when both --file and --compareVersion are provided", async () => {
            const options: OptionValues = {
                packageKey: "test-package",
                nodeKey: "test-node",
                baseVersion: "STAGING",
                compareVersion: "1.0.0",
                file: "./node.json",
            };

            await expect(
                (module as any).diffNode(testContext, mockCommand, options)
            ).rejects.toThrow("Please provide either --compareVersion or --file, but not both.");

            expect(mockNodeDiffService.diff).not.toHaveBeenCalled();
            expect(mockNodeDiffService.diffWithFile).not.toHaveBeenCalled();
        });

        it("should throw when neither --file nor --compareVersion is provided", async () => {
            const options: OptionValues = {
                packageKey: "test-package",
                nodeKey: "test-node",
                baseVersion: "STAGING",
            };

            await expect(
                (module as any).diffNode(testContext, mockCommand, options)
            ).rejects.toThrow("Please provide either --compareVersion or --file, but not both.");

            expect(mockNodeDiffService.diff).not.toHaveBeenCalled();
            expect(mockNodeDiffService.diffWithFile).not.toHaveBeenCalled();
        });

        it("should call diff when only --compareVersion is provided", async () => {
            const options: OptionValues = {
                packageKey: "test-package",
                nodeKey: "test-node",
                baseVersion: "STAGING",
                compareVersion: "1.0.0",
                json: true,
            };

            await (module as any).diffNode(testContext, mockCommand, options);

            expect(mockNodeDiffService.diff).toHaveBeenCalledWith(
                "test-package",
                "test-node",
                "STAGING",
                "1.0.0",
                true
            );
            expect(mockNodeDiffService.diffWithFile).not.toHaveBeenCalled();
        });

        it("should call diffWithFile when only --file is provided", async () => {
            const options: OptionValues = {
                packageKey: "test-package",
                nodeKey: "test-node",
                baseVersion: "STAGING",
                file: "./node.json",
            };

            await (module as any).diffNode(testContext, mockCommand, options);

            expect(mockNodeDiffService.diffWithFile).toHaveBeenCalledWith(
                "test-package",
                "test-node",
                "STAGING",
                "./node.json",
                undefined
            );
            expect(mockNodeDiffService.diff).not.toHaveBeenCalled();
        });
    });
});

