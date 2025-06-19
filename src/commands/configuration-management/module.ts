/**
 * Commands related to Celonis configuration management.
 */

import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { ConfigCommandService } from "./config-command.service";
import { VariableCommandService } from "./variable-command.service";

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
            .requiredOption("--packageKeys <packageKeys...>", "Keys of packages to export")
            .option("--withDependencies", "Include variables and dependencies", "")
            .action(this.batchExportPackages);

        configCommand.command("import")
            .description("Command to import package configs")
            .option("--overwrite", "Flag to allow overwriting of packages")
            .requiredOption("-f, --file <file>", "Exported packages file (relative path)")
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
        await new ConfigCommandService(context).batchExportPackages(options.packageKeys, options.withDependencies);
    }

    private async batchImportPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ConfigCommandService(context).batchImportPackages(options.file, options.overwrite);
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
}

export = Module;