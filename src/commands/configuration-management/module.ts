/**
 * Commands related to Celonis configuration management.
 */

import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { ConfigCommandService } from "./config-command.service";
import { VariableCommandService } from "./variable-command.service";
import { NodeService } from "./node.service";
import { NodeDiffService } from "./node-diff.service";
import { NodeDependencyService } from "./node-dependency.service";
import { PackageVersionCommandService } from "./package-version-command.service";
import { PackageValidationService } from "./package-validation.service";
import { fileService } from "../../core/utils/file-service";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        const configCommand = configurator.command("config");
        configCommand.command("list")
            .description("Command to list packages")
            .option("--json", "Return response as json type", "")
            .option("--flavors <flavors...>", "Lists only active packages of the given flavors")
            .option("--withDependencies", "Include dependencies", "")
            .option("--packageKeys <packageKeys...>", "Lists only active versions of given package keys")
            .option("--keysByVersion <keysByVersion...>", "Lists packages by given key and version [packageKey.version]")
            .option("--variableValue <variableValue>", "Variable value for filtering packages by.")
            .option("--variableType <variableType>", "Variable type for filtering packages by.")
            .action(this.listPackages);

        configCommand.command("export")
            .description("Command to export package configs")
            .option("--packageKeys <packageKeys...>", "Keys of packages to export. Exports the latest deployed version only")
            .option("--keysByVersion <keysByVersion...>", "Keys of packages to export by version")
            .option("--withDependencies", "Include variables and dependencies", "")
            .option("--unzip", "Unzip the exported file", "")
            .option("--gitProfile <gitProfile>", "Git profile which you want to use for the Git operations")
            .option("--gitBranch <gitBranch>", "Git branch in which you want to push the exported file")
            .action(this.batchExportPackages);

        const metadataCommand = configCommand.command("metadata")
            .description("Commands related to package metadata")

        metadataCommand
            .command("export")
            .description("Command to show whether packages have unpublished changes")
            .requiredOption("--packageKeys <packageKeys...>", "Keys of packages to find the metadata of")
            .option("--json", "Return response as json type", "")
            .action(this.batchExportPackagesMetadata);

        configCommand.command("import")
            .description("Command to import package configs")
            .option("--overwrite", "Flag to allow overwriting of packages")
            .option("--validate", "Validate node configurations before import", false)
            .option("--gitProfile <gitProfile>", "Git profile which you want to use for the Git operations")
            .option("--gitBranch <gitBranch>", "Git branch from which you want to pull the exported file and import")
            .option("-f, --file <file>", "Exported packages file (relative path)")
            .option("-d, --directory <directory>", "Exported packages directory (relative path)")
            .action(this.batchImportPackages);

        configCommand.command("validate")
            .description("Validate package node configurations")
            .requiredOption("--packageKey <packageKey>", "Key of the package to validate")
            .option("--layers <layers...>", "Validation layers to run", ["SCHEMA"])
            .option("--nodeKeys <nodeKeys...>", "Specific node keys to validate (default: all nodes)")
            .option("--json", "Return the response as a JSON file")
            .action(this.validatePackage);

        configCommand.command("diff")
            .description("Command to diff configs of packages")
            .option("--hasChanges", "Flag to return only the information if the package has changes without the actual changes")
            .option("--json", "Return the response as a JSON file")
            .requiredOption("-f, --file <file>", "Exported packages file (relative or absolute path)")
            .action(this.diffPackages);

        const configVersionCommand = configCommand.command("versions")
            .description("Commands related to Package version metadata");

        configVersionCommand.command("get")
            .description("Get version metadata for a specific package version")
            .requiredOption("--packageKey <packageKey>", "Identifier of the package")
            .requiredOption("--packageVersion <packageVersion>", "Version of the package. Can be a specific version or \"LATEST\" keyword, which will return the most recently created version.")
            .option("--json", "Return the response as a JSON file")
            .action(this.getPackageVersion)

        configVersionCommand.command("create")
            .description("Create a new version for a package")
            .requiredOption("--packageKey <packageKey>", "Identifier of the package")
            .option("--packageVersion <packageVersion>", "Version string (required if versionBumpOption is NONE)")
            .option("--versionBumpOption <versionBumpOption>", "Version bump option: NONE or PATCH", "NONE")
            .option("--summaryOfChanges <summaryOfChanges>", "Summary of changes for this version")
            .option("--nodeFilterKeys <nodeFilterKeys...>", "Node keys to include in the version. If omitted, all nodes of the package are included.")
            .option("--json", "Return the response as a JSON file")
            .action(this.createPackageVersion);

        const variablesCommand = configCommand.command("variables")
            .description("Commands related to variable configs");

        variablesCommand.command("list")
            .description("List package variables: use --packageKeys for unversioned, or --keysByVersion / --keysByVersionFile for versioned packages")
            .option("--json", "Return response as json type", "")
            .option("--packageKeys <packageKeys...>", "Package keys (unversioned variables only; mutually exclusive with versioned options)", [])
            .option("--keysByVersion <keysByVersion...>", "Mapping of package keys and versions", [])
            .option("--keysByVersionFile <keysByVersionFile>", "Package keys by version mappings file path.", "")
            .action(this.listVariables);

        const nodesCommand = configCommand.command("nodes")
            .description("Commands related to nodes of the package");

        nodesCommand.command("get")
            .description("Find a specific node in a package")
            .requiredOption("--packageKey <packageKey>", "Identifier of the package")
            .requiredOption("--nodeKey <nodeKey>", "Identifier of the node")
            .option("--packageVersion <packageVersion>", "Version of the package")
            .option("--withConfiguration", "Include node configuration in the response", false)
            .option("--json", "Return the response as a JSON file")
            .action(this.findNode);

        nodesCommand.command("create")
            .description("Create a new staging node in a package")
            .requiredOption("--packageKey <packageKey>", "Identifier of the package")
            .option("--body <body>", "Node payload as JSON string")
            .option("-f, --file <file>", "Path to a JSON file containing the node payload")
            .option("--validate", "Only validate the payload without persisting. Returns success if valid.", false)
            .option("--json", "Return the response as a JSON file")
            .action(this.createNode);

        nodesCommand.command("update")
            .description("Update a staging node in a package")
            .requiredOption("--packageKey <packageKey>", "Identifier of the package")
            .requiredOption("--nodeKey <nodeKey>", "Identifier of the node")
            .option("--body <body>", "Node payload as JSON string")
            .option("-f, --file <file>", "Path to a JSON file containing the node payload")
            .option("--validate", "Only validate the payload without persisting. Returns success if valid.", false)
            .option("--json", "Return the response as a JSON file")
            .action(this.updateNode);

        nodesCommand.command("delete")
            .description("Delete (archive) a staging node in a package")
            .requiredOption("--packageKey <packageKey>", "Identifier of the package")
            .requiredOption("--nodeKey <nodeKey>", "Identifier of the node")
            .option("--force", "Force delete even if the node has dependants", false)
            .action(this.archiveNode);

        nodesCommand.command("list")
            .description("List nodes in a specific package version")
            .requiredOption("--packageKey <packageKey>", "Identifier of the package")
            .requiredOption("--packageVersion <packageVersion>", "Version of the package")
            .option("--limit <limit>", "Limit the number of results returned")
            .option("--offset <offset>", "Offset for pagination")
            .option("--withConfiguration", "Include node configuration in the response", false)
            .option("--json", "Return the response as a JSON file")
            .action(this.listNodes);

        nodesCommand.command("diff")
            .description("Diff two versions of a specific node in a package")
            .requiredOption("--packageKey <packageKey>", "Identifier of the package")
            .requiredOption("--nodeKey <nodeKey>", "Identifier of the node")
            .requiredOption("--baseVersion <baseVersion>", "Base version of the node")
            .requiredOption("--compareVersion <compareVersion>", "Compare version of the node")
            .option("--json", "Return the response as a JSON file")
            .action(this.diffNode);

        const nodeDependenciesCommand = nodesCommand.command("dependencies")
            .description("Commands related to node dependencies");

        nodeDependenciesCommand.command("list")
            .description("List dependencies of a specific node in a package")
            .requiredOption("--packageKey <packageKey>", "Identifier of the package")
            .requiredOption("--nodeKey <nodeKey>", "Identifier of the node")
            .option("--packageVersion <packageVersion>", "Version of the package. If not sent, the staging state of the package will be used.")
            .option("--json", "Return the response as a JSON file")
            .action(this.listNodeDependencies);

        const listCommand = configurator.command("list");
        listCommand.command("assignments")
            .description("Command to list possible variable assignments for a type")
            .option("--json", "Return response as json type", "")
            .requiredOption("--type <type>", "Type of variable")
            .option("--params <params>", "Variable query params")
            .action(this.listAssignments);
    }

    private async listPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        if (options.packageKeys && options.keysByVersion) {
            throw new Error("Please provide either --packageKeys or --keysByVersion, but not both.");
        }
        await new ConfigCommandService(context).listPackages(options.json, options.flavors, options.withDependencies, options.packageKeys, options.keysByVersion, options.variableValue, options.variableType);
    }

    private async batchExportPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        if ((options.packageKeys && options.keysByVersion) || (!options.packageKeys && !options.keysByVersion)) {
            throw new Error("Please provide either --packageKeys or --keysByVersion, but not both.");
        }
        if (options.gitProfile && !options.gitBranch) {
            throw new Error("Please specify a branch using --gitBranch when using a Git profile.");
        }
        options.withDependencies = options.withDependencies ?? false;
        await new ConfigCommandService(context).batchExportPackages(options.packageKeys, options.keysByVersion, options.withDependencies, options.gitBranch, options.unzip);
    }

    private async batchExportPackagesMetadata(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ConfigCommandService(context).batchExportPackagesMetadata(options.packageKeys, options.json);
    }

    private async getPackageVersion(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new PackageVersionCommandService(context).getPackageVersion(options.packageKey, options.packageVersion, options.json);
    }

    private async createPackageVersion(context: Context, command: Command, options: OptionValues): Promise<void> {
        const hasExplicitVersion = !!options.packageVersion;
        const hasVersionBump = options.versionBumpOption && options.versionBumpOption !== "NONE";

        if (hasExplicitVersion && hasVersionBump) {
            throw new Error("Please provide either --packageVersion or --versionBumpOption, but not both.");
        }
        if (!hasExplicitVersion && !hasVersionBump) {
            throw new Error("Please provide either --packageVersion or --versionBumpOption PATCH.");
        }

        await new PackageVersionCommandService(context).createPackageVersion(
            options.packageKey,
            options.packageVersion,
            options.versionBumpOption,
            options.summaryOfChanges,
            options.nodeFilterKeys,
            options.json,
        );
    }

    private async batchImportPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        if (options.gitProfile && !options.gitBranch) {
            throw new Error("Please specify a branch using --gitBranch when using a Git profile.");
        }
        await new ConfigCommandService(context).batchImportPackages(options.file, options.directory, options.overwrite, options.gitBranch, options.validate);
    }

    private async diffPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ConfigCommandService(context).diffPackages(options.file, options.hasChanges, options.json);
    }

    private async validatePackage(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new PackageValidationService(context).validatePackage(options.packageKey, options.layers, options.nodeKeys, options.json);
    }

    private async listVariables(context: Context, command: Command, options: OptionValues): Promise<void> {
        const hasStagingKeys = options.packageKeys.length > 0;
        const hasVersioned =
            options.keysByVersion.length > 0 || options.keysByVersionFile !== "";

        if (hasStagingKeys && hasVersioned) {
            throw new Error(
                "Please provide either --packageKeys or --keysByVersion/--keysByVersionFile, but not both."
            );
        }
        if (!hasStagingKeys && !hasVersioned) {
            throw new Error(
                "Please provide --packageKeys for staging, or --keysByVersion / --keysByVersionFile for versioned packages."
            );
        }

        await new ConfigCommandService(context).listVariables(
            options.json,
            options.keysByVersion,
            options.keysByVersionFile,
            options.packageKeys
        );
    }

    private async listAssignments(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new VariableCommandService(context).listAssignments(options.type, options.json, options.params);
    }

    private async findNode(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new NodeService(context).findNode(options.packageKey, options.nodeKey, options.withConfiguration, options.packageVersion ?? null, options.json);
    }

    private async createNode(context: Context, command: Command, options: OptionValues): Promise<void> {
        const body = Module.resolveBody(options.body, options.file);
        await new NodeService(context).createNode(options.packageKey, body, options.validate, options.json);
    }

    private async updateNode(context: Context, command: Command, options: OptionValues): Promise<void> {
        const body = Module.resolveBody(options.body, options.file);
        await new NodeService(context).updateNode(options.packageKey, options.nodeKey, body, options.validate, options.json);
    }

    private static resolveBody(body: string | undefined, file: string | undefined): string {
        if (body && file) {
            throw new Error("Please provide either --body or --file, but not both.");
        }
        if (!body && !file) {
            throw new Error("Please provide either --body or --file.");
        }
        if (file) {
            return fileService.readFile(file);
        }
        return body!;
    }

    private async archiveNode(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new NodeService(context).archiveNode(options.packageKey, options.nodeKey, options.force);
    }

    private async listNodes(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new NodeService(context).listNodes(options.packageKey, options.packageVersion, options.limit, options.offset, options.withConfiguration, options.json);
    }

    private async diffNode(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new NodeDiffService(context).diff(options.packageKey, options.nodeKey, options.baseVersion, options.compareVersion, options.json);
    }

    private async listNodeDependencies(context: Context, command: Command, options: OptionValues): Promise<void> {
        if (options.packageVersion === "") {
            throw new Error("Please specify a valid package version");
        }
        await new NodeDependencyService(context).listNodeDependencies(options.packageKey, options.nodeKey, options.packageVersion, options.json);
    }
}

export = Module;