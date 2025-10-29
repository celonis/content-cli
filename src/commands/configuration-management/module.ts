/**
 * Commands related to Celonis configuration management.
 */

import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { ConfigCommandService } from "./config-command.service";
import { VariableCommandService } from "./variable-command.service";
import { NodeService } from "./node.service";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        const configCommand = configurator.command("config");
        configCommand.command("list")
            .description("Command to list active packages that can be exported")
            .option("--json", "Return response as json type", "")
            .option("--flavors <flavors...>", "Lists only active packages of the given flavors")
            .option("--withDependencies", "Include dependencies", "")
            .option("--packageKeys <packageKeys...>", "Lists only given package keys")
            .option("--variableValue <variableValue>", "Variable value for filtering packages by.")
            .option("--variableType <variableType>", "Variable type for filtering packages by.")
            .action(this.listActivePackages);

        configCommand.command("export")
            .description("Command to export package configs")
            .option("--packageKeys <packageKeys...>", "Keys of packages to export. Exports the latest deployed version only")
            .option("--keysByVersion <keysByVersion...>", "Keys of packages to export by version")
            .option("--withDependencies", "Include variables and dependencies", "")
            .option("--unzip", "Unzip the exported file", "")
            .betaOption("--gitProfile <gitProfile>", "Git profile which you want to use for the Git operations")
            .betaOption("--gitBranch <gitBranch>", "Git branch in which you want to push the exported file")
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
            .betaOption("--gitProfile <gitProfile>", "Git profile which you want to use for the Git operations")
            .betaOption("--gitBranch <gitBranch>", "Git branch from which you want to pull the exported file and import")
            .option("-f, --file <file>", "Exported packages file (relative path)")
            .option("-d, --directory <directory>", "Exported packages directory (relative path)")
            .action(this.batchImportPackages);

        configCommand.command("diff")
            .description("Command to diff configs of packages")
            .option("--hasChanges", "Flag to return only the information if the package has changes without the actual changes")
            .option("--json", "Return the response as a JSON file")
            .requiredOption("-f, --file <file>", "Exported packages file (relative or absolute path)")
            .action(this.diffPackages);

        const variablesCommand = configCommand.command("variables")
            .description("Commands related to variable configs");

        variablesCommand.command("list")
            .description("Command to list versioned variables of packages")
            .option("--json", "Return response as json type", "")
            .option("--keysByVersion <keysByVersion...>", "Mapping of package keys and versions", "")
            .option("--keysByVersionFile <keysByVersionFile>", "Package keys by version mappings file path.", "")
            .action(this.listVariables);

        const nodesCommand = configCommand.command("nodes")
            .description("Commands related to nodes of the package");

        nodesCommand.command("get")
            .description("Find a specific node in a package")
            .requiredOption("--packageKey <packageKey>", "Identifier of the package")
            .requiredOption("--nodeKey <nodeKey>", "Identifier of the node")
            .option("--version <version>", "Version of the package")
            .option("--withConfiguration", "Include node configuration in the response", false)
            .option("--json", "Return the response as a JSON file")
            .action(this.findNode);

        const listCommand = configurator.command("list");
        listCommand.command("assignments")
            .description("Command to list possible variable assignments for a type")
            .option("--json", "Return response as json type", "")
            .requiredOption("--type <type>", "Type of variable")
            .option("--params <params>", "Variable query params")
            .action(this.listAssignments);
    }

    private async listActivePackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ConfigCommandService(context).listActivePackages(options.json, options.flavors, options.withDependencies, options.packageKeys, options.variableValue, options.variableType);
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

    private async batchImportPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        if (options.gitProfile && !options.gitBranch) {
            throw new Error("Please specify a branch using --gitBranch when using a Git profile.");
        }
        await new ConfigCommandService(context).batchImportPackages(options.file, options.directory, options.overwrite, options.gitBranch);
    }

    private async diffPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ConfigCommandService(context).diffPackages(options.file, options.hasChanges, options.json);
    }

    private async listVariables(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ConfigCommandService(context).listVariables(options.json, options.keysByVersion, options.keysByVersionFile);
    }

    private async listAssignments(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new VariableCommandService(context).listAssignments(options.type, options.json, options.params);
    }

    private async findNode(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new NodeService(context).findNode(options.packageKey, options.nodeKey, options.withConfiguration, options.version ?? null, options.json);
    }
}

export = Module;