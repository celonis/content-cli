import Module = require("../../../src/commands/configuration-management/module");
import { Command } from "commander";
import { ConfigCommandService } from "../../../src/commands/configuration-management/config-command.service";
import { StagingPackageService } from "../../../src/commands/configuration-management/staging-package.service";
import { MetadataService } from "../../../src/commands/configuration-management/metadata.service";
import { T2tcCommandService } from "../../../src/commands/t2tc/t2tc-command.service";
import { NodeDependencyService } from "../../../src/commands/configuration-management/node-dependency.service";
import { PackageVersionCommandService } from "../../../src/commands/configuration-management/package-version-command.service";
import { NodeDiffService } from "../../../src/commands/configuration-management/node-diff.service";
import { SinglePackageImportService } from "../../../src/commands/configuration-management/single-package-import.service";
import { SinglePackageExportService } from "../../../src/commands/configuration-management/single-package-export.service";
import { buildTestProgram } from "../../utls/cli-program";
import { loggingTestTransport } from "../../jest.setup";

jest.mock("../../../src/commands/configuration-management/config-command.service");
jest.mock("../../../src/commands/configuration-management/staging-package.service");
jest.mock("../../../src/commands/configuration-management/metadata.service");
jest.mock("../../../src/commands/t2tc/t2tc-command.service");
jest.mock("../../../src/commands/configuration-management/node-dependency.service");
jest.mock("../../../src/commands/configuration-management/node-diff.service");
jest.mock("../../../src/commands/configuration-management/package-version-command.service");
jest.mock("../../../src/commands/configuration-management/single-package-import.service");
jest.mock("../../../src/commands/configuration-management/single-package-export.service");

describe("configuration-management command integration", () => {
    let program: Command;
    let mockConfigCommandService: jest.Mocked<ConfigCommandService>;
    let mockStagingPackageService: jest.Mocked<StagingPackageService>;
    let mockMetadataService: jest.Mocked<MetadataService>;
    let mockT2tcCommandService: jest.Mocked<T2tcCommandService>;
    let mockNodeDependencyService: jest.Mocked<NodeDependencyService>;
    let mockNodeDiffService: jest.Mocked<NodeDiffService>;
    let mockPackageVersionCommandService: jest.Mocked<PackageVersionCommandService>;
    let mockSinglePackageImportService: jest.Mocked<SinglePackageImportService>;
    let mockSinglePackageExportService: jest.Mocked<SinglePackageExportService>;

    beforeEach(() => {
        mockConfigCommandService = {
            listVariables: jest.fn().mockResolvedValue(undefined),
        } as any;

        mockStagingPackageService = {
            listStagingPackages: jest.fn().mockResolvedValue(undefined),
        } as any;

        mockMetadataService = {
            exportPackagesMetadata: jest.fn().mockResolvedValue(undefined),
        } as any;

        mockT2tcCommandService = {
            listPackages: jest.fn().mockResolvedValue(undefined),
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

        mockPackageVersionCommandService = {
            createPackageVersion: jest.fn().mockResolvedValue(undefined),
            getPackageVersion: jest.fn().mockResolvedValue(undefined),
        } as any;

        mockSinglePackageImportService = {
            importPackage: jest.fn().mockResolvedValue(undefined),
        } as any;

        mockSinglePackageExportService = {
            exportPackage: jest.fn().mockResolvedValue(undefined),
        } as any;

        (ConfigCommandService as jest.MockedClass<typeof ConfigCommandService>).mockImplementation(() => mockConfigCommandService);
        (StagingPackageService as jest.MockedClass<typeof StagingPackageService>).mockImplementation(() => mockStagingPackageService);
        (MetadataService as jest.MockedClass<typeof MetadataService>).mockImplementation(() => mockMetadataService);
        (T2tcCommandService as jest.MockedClass<typeof T2tcCommandService>).mockImplementation(() => mockT2tcCommandService);
        (NodeDependencyService as jest.MockedClass<typeof NodeDependencyService>).mockImplementation(() => mockNodeDependencyService);
        (NodeDiffService as jest.MockedClass<typeof NodeDiffService>).mockImplementation(() => mockNodeDiffService);
        (PackageVersionCommandService as jest.MockedClass<typeof PackageVersionCommandService>).mockImplementation(() => mockPackageVersionCommandService);
        (SinglePackageImportService as jest.MockedClass<typeof SinglePackageImportService>).mockImplementation(() => mockSinglePackageImportService);
        (SinglePackageExportService as jest.MockedClass<typeof SinglePackageExportService>).mockImplementation(() => mockSinglePackageExportService);

        program = buildTestProgram([Module]);
    });

    function runCli(args: string[]): Promise<Command> {
        return program.parseAsync(["node", "content-cli", ...args]);
    }

    /**
     * Action-body validation errors (`throw new Error(...)`) are caught by
     * Configurator.action and re-emitted via `logger.error(...)`, so we
     * inspect the in-memory winston transport instead of asserting on
     * promise rejection. The level field is colorized by `winston.format.cli()`,
     * hence the substring match.
     */
    function expectErrorLogged(message: string): void {
        expect(loggingTestTransport.logMessages).toEqual(expect.arrayContaining([
            expect.objectContaining({
                level: expect.stringContaining("error"),
                message: expect.stringContaining(message),
            }),
        ]));
    }

    describe("config list (deprecated listPackages)", () => {
        it("rejects when both --packageKeys and --keysByVersion are provided", async () => {
            await runCli([
                "config", "list",
                "--packageKeys", "package1", "package2",
                "--keysByVersion", "package3.1.0.0", "package4.1.0.0",
            ]);

            expectErrorLogged("Please provide either --packageKeys or --keysByVersion, but not both.");
            expect(mockT2tcCommandService.listPackages).not.toHaveBeenCalled();
        });

        it("forwards only --packageKeys when provided", async () => {
            await runCli([
                "config", "list",
                "--packageKeys", "package1", "package2",
                "--json",
            ]);

            expect(mockT2tcCommandService.listPackages).toHaveBeenCalledWith(
                true,
                undefined,
                "",
                ["package1", "package2"],
                undefined,
                undefined,
                undefined,
                false,
                false
            );
        });

        it("forwards only --keysByVersion when provided", async () => {
            await runCli([
                "config", "list",
                "--keysByVersion", "package3.1.0.0", "package4.1.0.0",
                "--json",
            ]);

            expect(mockT2tcCommandService.listPackages).toHaveBeenCalledWith(
                true,
                undefined,
                "",
                undefined,
                ["package3.1.0.0", "package4.1.0.0"],
                undefined,
                undefined,
                false,
                false
            );
        });

        it("forwards --branches when provided", async () => {
            await runCli(["config", "list", "--branches", "--json"]);

            expect(mockT2tcCommandService.listPackages).toHaveBeenCalledWith(
                true,
                undefined,
                "",
                undefined,
                undefined,
                undefined,
                undefined,
                true,
                false
            );
        });

        describe("--staging incompatibility", () => {
            it("forwards --staging --branches without other filters", async () => {
                await runCli(["config", "list", "--branches", "--staging", "--json"]);

                expect(mockT2tcCommandService.listPackages).toHaveBeenCalledWith(
                    true,
                    undefined,
                    "",
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    true,
                    true
                );
            });

            it("rejects --staging combined with --packageKeys", async () => {
                await runCli([
                    "config", "list",
                    "--staging",
                    "--packageKeys", "package1", "package2",
                ]);

                expectErrorLogged(
                    "Staging parameter is not compatible with --withDependencies, --packageKeys, --keysByVersion, --variableValue, --variableType"
                );
            });

            it("rejects --staging combined with --withDependencies", async () => {
                await runCli(["config", "list", "--staging", "--withDependencies"]);

                expectErrorLogged(
                    "Staging parameter is not compatible with --withDependencies, --packageKeys, --keysByVersion, --variableValue, --variableType"
                );
            });

            it("rejects --staging combined with --keysByVersion", async () => {
                await runCli([
                    "config", "list",
                    "--staging",
                    "--keysByVersion", "package3.1.0.0", "package4.1.0.0",
                ]);

                expectErrorLogged(
                    "Staging parameter is not compatible with --withDependencies, --packageKeys, --keysByVersion, --variableValue, --variableType"
                );
            });

            it("rejects --staging combined with --variableValue", async () => {
                await runCli(["config", "list", "--staging", "--variableValue", "myValue"]);

                expectErrorLogged(
                    "Staging parameter is not compatible with --withDependencies, --packageKeys, --keysByVersion, --variableValue, --variableType"
                );
            });

            it("rejects --staging combined with --variableType", async () => {
                await runCli(["config", "list", "--staging", "--variableType", "myType"]);

                expectErrorLogged(
                    "Staging parameter is not compatible with --withDependencies, --packageKeys, --keysByVersion, --variableValue, --variableType"
                );
            });
        });
    });

    describe("config package list (listStagingPackages)", () => {
        it("forwards --json and --flavors", async () => {
            await runCli(["config", "package", "list", "--json", "--flavors", "APP"]);

            expect(mockStagingPackageService.listStagingPackages).toHaveBeenCalledWith(
                ["APP"],
                false,
                true
            );
        });

        it("defaults flavors to an empty list and json to '' when not provided", async () => {
            await runCli(["config", "package", "list"]);

            expect(mockStagingPackageService.listStagingPackages).toHaveBeenCalledWith([], false, "");
        });

        it("forwards multiple --flavors values", async () => {
            await runCli(["config", "package", "list", "--flavors", "APP", "ANALYSIS"]);

            expect(mockStagingPackageService.listStagingPackages).toHaveBeenCalledWith(
                ["APP", "ANALYSIS"],
                false,
                ""
            );
            expect(mockT2tcCommandService.listPackages).not.toHaveBeenCalled();
        });
    });

    describe("config export (deprecated batchExportPackages)", () => {
        it("rejects when both --packageKeys and --keysByVersion are provided", async () => {
            await runCli([
                "config", "export",
                "--packageKeys", "package1", "package2",
                "--keysByVersion", "package3:v1", "package4:v2",
            ]);

            expectErrorLogged("Please provide either --packageKeys or --keysByVersion, but not both.");
            expect(mockT2tcCommandService.batchExportPackages).not.toHaveBeenCalled();
        });

        it("rejects when neither --packageKeys nor --keysByVersion are provided", async () => {
            await runCli(["config", "export"]);

            expectErrorLogged("Please provide either --packageKeys or --keysByVersion, but not both.");
            expect(mockT2tcCommandService.batchExportPackages).not.toHaveBeenCalled();
        });

        it("forwards only --packageKeys when provided", async () => {
            await runCli(["config", "export", "--packageKeys", "package1", "package2"]);

            expect(mockT2tcCommandService.batchExportPackages).toHaveBeenCalledWith(
                ["package1", "package2"],
                undefined,
                "",
                undefined,
                ""
            );
        });

        it("forwards only --keysByVersion when provided", async () => {
            await runCli(["config", "export", "--keysByVersion", "package3:v1", "package4:v2"]);

            expect(mockT2tcCommandService.batchExportPackages).toHaveBeenCalledWith(
                undefined,
                ["package3:v1", "package4:v2"],
                "",
                undefined,
                ""
            );
        });

        it("rejects when --gitProfile is provided without --gitBranch", async () => {
            await runCli([
                "config", "export",
                "--packageKeys", "package1",
                "--gitProfile", "myProfile",
            ]);

            expectErrorLogged("Please specify a branch using --gitBranch when using a Git profile.");
            expect(mockT2tcCommandService.batchExportPackages).not.toHaveBeenCalled();
        });

        it("forwards --gitProfile + --gitBranch", async () => {
            await runCli([
                "config", "export",
                "--packageKeys", "package1",
                "--gitProfile", "myProfile",
                "--gitBranch", "main",
            ]);

            expect(mockT2tcCommandService.batchExportPackages).toHaveBeenCalledWith(
                ["package1"],
                undefined,
                "",
                "main",
                ""
            );
        });

        it("forwards --withDependencies", async () => {
            await runCli([
                "config", "export",
                "--packageKeys", "package1",
                "--withDependencies",
            ]);

            expect(mockT2tcCommandService.batchExportPackages).toHaveBeenCalledWith(
                ["package1"],
                undefined,
                true,
                undefined,
                ""
            );
        });

        it("forwards --unzip", async () => {
            await runCli([
                "config", "export",
                "--packageKeys", "package1",
                "--unzip",
            ]);

            expect(mockT2tcCommandService.batchExportPackages).toHaveBeenCalledWith(
                ["package1"],
                undefined,
                "",
                undefined,
                true
            );
        });

        it("fails on packageKeys/keysByVersion conflict before checking --gitProfile", async () => {
            await runCli([
                "config", "export",
                "--packageKeys", "package1",
                "--keysByVersion", "package2:v1",
                "--gitProfile", "myProfile",
            ]);

            expectErrorLogged("Please provide either --packageKeys or --keysByVersion, but not both.");
            expect(mockT2tcCommandService.batchExportPackages).not.toHaveBeenCalled();
        });
    });

    describe("config import (deprecated batchImportPackages)", () => {
        it("rejects when --gitProfile is provided without --gitBranch", async () => {
            await runCli([
                "config", "import",
                "--file", "export.zip",
                "--gitProfile", "myProfile",
            ]);

            expectErrorLogged("Please specify a branch using --gitBranch when using a Git profile.");
            expect(mockT2tcCommandService.batchImportPackages).not.toHaveBeenCalled();
        });

        it("forwards --gitProfile + --gitBranch with --file", async () => {
            await runCli([
                "config", "import",
                "--file", "export.zip",
                "--gitProfile", "myProfile",
                "--gitBranch", "main",
            ]);

            expect(mockT2tcCommandService.batchImportPackages).toHaveBeenCalledWith(
                "export.zip",
                undefined,
                undefined,
                "main",
                false
            );
        });

        it("forwards --directory + --gitBranch", async () => {
            await runCli([
                "config", "import",
                "--directory", "./exported",
                "--gitBranch", "develop",
            ]);

            expect(mockT2tcCommandService.batchImportPackages).toHaveBeenCalledWith(
                undefined,
                "./exported",
                undefined,
                "develop",
                false
            );
        });

        it("forwards minimal --file invocation", async () => {
            await runCli(["config", "import", "--file", "export.zip"]);

            expect(mockT2tcCommandService.batchImportPackages).toHaveBeenCalledWith(
                "export.zip",
                undefined,
                undefined,
                undefined,
                false
            );
        });

        it("forwards --directory invocation", async () => {
            await runCli(["config", "import", "--directory", "./my-exports"]);

            expect(mockT2tcCommandService.batchImportPackages).toHaveBeenCalledWith(
                undefined,
                "./my-exports",
                undefined,
                undefined,
                false
            );
        });

        it("forwards --overwrite", async () => {
            await runCli(["config", "import", "--file", "export.zip", "--overwrite"]);

            expect(mockT2tcCommandService.batchImportPackages).toHaveBeenCalledWith(
                "export.zip",
                undefined,
                true,
                undefined,
                false
            );
        });

        it("forwards combined options", async () => {
            await runCli([
                "config", "import",
                "--directory", "./exports",
                "--overwrite",
                "--gitBranch", "feature-branch",
            ]);

            expect(mockT2tcCommandService.batchImportPackages).toHaveBeenCalledWith(
                undefined,
                "./exports",
                true,
                "feature-branch",
                false
            );
        });
    });

    describe("config package import (importSinglePackage)", () => {
        it("forwards --file", async () => {
            await runCli(["config", "package", "import", "--file", "single-package.zip"]);

            expect(mockSinglePackageImportService.importPackage).toHaveBeenCalledWith(
                "single-package.zip",
                undefined,
                undefined,
                undefined,
                undefined
            );
        });

        it("forwards --directory", async () => {
            await runCli(["config", "package", "import", "--directory", "./single-package-dir"]);

            expect(mockSinglePackageImportService.importPackage).toHaveBeenCalledWith(
                undefined,
                "./single-package-dir",
                undefined,
                undefined,
                undefined
            );
        });

        it("forwards --overwrite and --json", async () => {
            await runCli([
                "config", "package", "import",
                "--file", "single-package.zip",
                "--overwrite",
                "--json",
            ]);

            expect(mockSinglePackageImportService.importPackage).toHaveBeenCalledWith(
                "single-package.zip",
                undefined,
                true,
                true,
                undefined
            );
        });

        it("forwards --gitBranch + --gitProfile", async () => {
            await runCli([
                "config", "package", "import",
                "--gitProfile", "myProfile",
                "--gitBranch", "feature-branch",
            ]);

            expect(mockSinglePackageImportService.importPackage).toHaveBeenCalledWith(
                undefined,
                undefined,
                undefined,
                undefined,
                "feature-branch"
            );
        });

        it("rejects when --gitProfile is provided without --gitBranch", async () => {
            await runCli([
                "config", "package", "import",
                "--file", "single-package.zip",
                "--gitProfile", "myProfile",
            ]);

            expectErrorLogged("Please specify a branch using --gitBranch when using a Git profile.");
            expect(mockSinglePackageImportService.importPackage).not.toHaveBeenCalled();
        });
    });

    describe("config package export (exportSinglePackage)", () => {
        it("exports unzipped by default (zip defaults to false)", async () => {
            await runCli(["config", "package", "export", "--packageKey", "my-package"]);

            expect(mockSinglePackageExportService.exportPackage).toHaveBeenCalledWith(
                "my-package",
                false,
                undefined
            );
        });

        it("forwards --zip", async () => {
            await runCli(["config", "package", "export", "--packageKey", "my-package", "--zip"]);

            expect(mockSinglePackageExportService.exportPackage).toHaveBeenCalledWith(
                "my-package",
                true,
                undefined
            );
        });

        it("forwards --gitBranch + --gitProfile", async () => {
            await runCli([
                "config", "package", "export",
                "--packageKey", "my-package",
                "--gitProfile", "myProfile",
                "--gitBranch", "feature-branch",
            ]);

            expect(mockSinglePackageExportService.exportPackage).toHaveBeenCalledWith(
                "my-package",
                false,
                "feature-branch"
            );
        });

        it("rejects when --gitProfile is provided without --gitBranch", async () => {
            await runCli([
                "config", "package", "export",
                "--packageKey", "my-package",
                "--gitProfile", "myProfile",
            ]);

            expectErrorLogged("Please specify a branch using --gitBranch when using a Git profile.");
            expect(mockSinglePackageExportService.exportPackage).not.toHaveBeenCalled();
        });
    });

    describe("config variables list (listVariables)", () => {
        it("rejects when --packageKeys and --keysByVersion are both provided", async () => {
            await runCli([
                "config", "variables", "list",
                "--packageKeys", "pkg-a",
                "--keysByVersion", "key-1:1.0.0",
            ]);

            expectErrorLogged(
                "Please provide either --packageKeys or --keysByVersion/--keysByVersionFile, but not both."
            );
            expect(mockConfigCommandService.listVariables).not.toHaveBeenCalled();
        });

        it("rejects when --packageKeys and --keysByVersionFile are both provided", async () => {
            await runCli([
                "config", "variables", "list",
                "--packageKeys", "pkg-a",
                "--keysByVersionFile", "mapping.json",
            ]);

            expectErrorLogged(
                "Please provide either --packageKeys or --keysByVersion/--keysByVersionFile, but not both."
            );
            expect(mockConfigCommandService.listVariables).not.toHaveBeenCalled();
        });

        it("rejects when neither staging nor versioned inputs are provided", async () => {
            await runCli(["config", "variables", "list"]);

            expectErrorLogged(
                "Please provide --packageKeys for staging, or --keysByVersion / --keysByVersionFile for versioned packages."
            );
            expect(mockConfigCommandService.listVariables).not.toHaveBeenCalled();
        });

        it("forwards staging-only variant when only --packageKeys is provided", async () => {
            await runCli([
                "config", "variables", "list",
                "--packageKeys", "pkg-a", "pkg-b",
                "--json",
            ]);

            expect(mockConfigCommandService.listVariables).toHaveBeenCalledWith(
                true,
                [],
                "",
                ["pkg-a", "pkg-b"]
            );
        });

        it("forwards versioned variant when only --keysByVersion is provided", async () => {
            await runCli([
                "config", "variables", "list",
                "--keysByVersion", "k:v",
            ]);

            expect(mockConfigCommandService.listVariables).toHaveBeenCalledWith(
                "",
                ["k:v"],
                "",
                []
            );
        });
    });

    describe("config versions create (createPackageVersion)", () => {
        it("rejects when both --packageVersion and --versionBumpOption PATCH are provided", async () => {
            await runCli([
                "config", "versions", "create",
                "--packageKey", "my-package",
                "--packageVersion", "1.2.0",
                "--versionBumpOption", "PATCH",
            ]);

            expectErrorLogged("Please provide either --packageVersion or --versionBumpOption, but not both.");
            expect(mockPackageVersionCommandService.createPackageVersion).not.toHaveBeenCalled();
        });

        it("rejects when --versionBumpOption is explicit NONE without --packageVersion", async () => {
            await runCli([
                "config", "versions", "create",
                "--packageKey", "my-package",
                "--versionBumpOption", "NONE",
            ]);

            expectErrorLogged("Please provide either --packageVersion or --versionBumpOption PATCH.");
            expect(mockPackageVersionCommandService.createPackageVersion).not.toHaveBeenCalled();
        });

        it("rejects when --packageVersion is missing and --versionBumpOption defaults to NONE", async () => {
            await runCli([
                "config", "versions", "create",
                "--packageKey", "my-package",
            ]);

            expectErrorLogged("Please provide either --packageVersion or --versionBumpOption PATCH.");
            expect(mockPackageVersionCommandService.createPackageVersion).not.toHaveBeenCalled();
        });

        it("forwards --packageVersion + --summaryOfChanges", async () => {
            await runCli([
                "config", "versions", "create",
                "--packageKey", "my-package",
                "--packageVersion", "1.2.0",
                "--versionBumpOption", "NONE",
                "--summaryOfChanges", "New features",
            ]);

            expect(mockPackageVersionCommandService.createPackageVersion).toHaveBeenCalledWith(
                "my-package",
                "1.2.0",
                "NONE",
                "New features",
                undefined,
                undefined
            );
        });

        it("forwards --versionBumpOption PATCH only", async () => {
            await runCli([
                "config", "versions", "create",
                "--packageKey", "my-package",
                "--versionBumpOption", "PATCH",
                "--summaryOfChanges", "Bug fixes",
            ]);

            expect(mockPackageVersionCommandService.createPackageVersion).toHaveBeenCalledWith(
                "my-package",
                undefined,
                "PATCH",
                "Bug fixes",
                undefined,
                undefined
            );
        });
    });

    describe("config nodes dependencies list (listNodeDependencies)", () => {
        it("forwards required arguments", async () => {
            await runCli([
                "config", "nodes", "dependencies", "list",
                "--packageKey", "test-package",
                "--nodeKey", "test-node",
                "--packageVersion", "1.0.0",
            ]);

            expect(mockNodeDependencyService.listNodeDependencies).toHaveBeenCalledWith(
                "test-package",
                "test-node",
                "1.0.0",
                undefined
            );
        });

        it("forwards --json", async () => {
            await runCli([
                "config", "nodes", "dependencies", "list",
                "--packageKey", "test-package",
                "--nodeKey", "test-node",
                "--packageVersion", "2.0.0",
                "--json",
            ]);

            expect(mockNodeDependencyService.listNodeDependencies).toHaveBeenCalledWith(
                "test-package",
                "test-node",
                "2.0.0",
                true
            );
        });

        it("calls listNodeDependencies exactly once", async () => {
            await runCli([
                "config", "nodes", "dependencies", "list",
                "--packageKey", "my-package",
                "--nodeKey", "my-node",
                "--packageVersion", "1.2.3",
                "--json",
            ]);

            expect(mockNodeDependencyService.listNodeDependencies).toHaveBeenCalledTimes(1);
            expect(mockNodeDependencyService.listNodeDependencies).toHaveBeenCalledWith(
                "my-package",
                "my-node",
                "1.2.3",
                true
            );
        });
    });

    describe("config diff (diffPackages)", () => {
        it("forwards minimal --file invocation", async () => {
            await runCli(["config", "diff", "--file", "package.zip"]);

            expect(mockT2tcCommandService.diffPackages).toHaveBeenCalledWith(
                "package.zip", undefined, undefined, undefined
            );
        });

        it("forwards --json", async () => {
            await runCli(["config", "diff", "--file", "package.zip", "--json"]);

            expect(mockT2tcCommandService.diffPackages).toHaveBeenCalledWith(
                "package.zip", undefined, undefined, true
            );
        });

        it("forwards --hasChanges", async () => {
            await runCli(["config", "diff", "--file", "package.zip", "--hasChanges"]);

            expect(mockT2tcCommandService.diffPackages).toHaveBeenCalledWith(
                "package.zip", true, undefined, undefined
            );
        });

        it("forwards --baseVersion", async () => {
            await runCli([
                "config", "diff",
                "--file", "package.zip",
                "--baseVersion", "1.0.0",
            ]);

            expect(mockT2tcCommandService.diffPackages).toHaveBeenCalledWith(
                "package.zip", undefined, "1.0.0", undefined
            );
        });

        it("forwards --hasChanges + --baseVersion together", async () => {
            await runCli([
                "config", "diff",
                "--file", "package.zip",
                "--hasChanges",
                "--baseVersion", "STAGING",
            ]);

            expect(mockT2tcCommandService.diffPackages).toHaveBeenCalledWith(
                "package.zip", true, "STAGING", undefined
            );
        });
    });

    describe("config nodes diff (diffNode)", () => {
        it("rejects when both --file and --compareVersion are provided", async () => {
            await runCli([
                "config", "nodes", "diff",
                "--packageKey", "test-package",
                "--nodeKey", "test-node",
                "--baseVersion", "STAGING",
                "--compareVersion", "1.0.0",
                "--file", "./node.json",
            ]);

            expectErrorLogged("Please provide either --compareVersion or --file, but not both.");
            expect(mockNodeDiffService.diff).not.toHaveBeenCalled();
            expect(mockNodeDiffService.diffWithFile).not.toHaveBeenCalled();
        });

        it("rejects when neither --file nor --compareVersion is provided", async () => {
            await runCli([
                "config", "nodes", "diff",
                "--packageKey", "test-package",
                "--nodeKey", "test-node",
                "--baseVersion", "STAGING",
            ]);

            expectErrorLogged("Please provide either --compareVersion or --file, but not both.");
            expect(mockNodeDiffService.diff).not.toHaveBeenCalled();
            expect(mockNodeDiffService.diffWithFile).not.toHaveBeenCalled();
        });

        it("calls diff when only --compareVersion is provided", async () => {
            await runCli([
                "config", "nodes", "diff",
                "--packageKey", "test-package",
                "--nodeKey", "test-node",
                "--baseVersion", "STAGING",
                "--compareVersion", "1.0.0",
                "--json",
            ]);

            expect(mockNodeDiffService.diff).toHaveBeenCalledWith(
                "test-package",
                "test-node",
                "STAGING",
                "1.0.0",
                true
            );
            expect(mockNodeDiffService.diffWithFile).not.toHaveBeenCalled();
        });

        it("calls diffWithFile when only --file is provided", async () => {
            await runCli([
                "config", "nodes", "diff",
                "--packageKey", "test-package",
                "--nodeKey", "test-node",
                "--baseVersion", "STAGING",
                "--file", "./node.json",
            ]);

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
