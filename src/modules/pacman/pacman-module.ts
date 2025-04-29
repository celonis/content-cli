/**
 * This module provides all 'PacMan' related commands.
 */

import { Command, OptionValues } from "commander";
import { CommandConfig, Configurator, IModule } from "../../core/module-handler";
import { logger } from "../../util/logger";
import { Context } from "../../core/cli-context";

class PacManModule implements IModule {
    register(context: Context, configurator: Configurator) {
        
        let configCmd = configurator.command('config');
        configCmd.description('Configuration management functions, such as export, import, etc.');
        configCmd.action(this.showHelp);


        configCmd.command("list")
            .description("Command to list active packages that can be exported")
            .option("--json", "Return response as json type", "")
            .option("--flavors <flavors...>", "Lists only active packages of the given flavors")
            .option("--withDependencies", "Include dependencies", "")
            .option("--packageKeys <packageKeys...>", "Lists only given package keys")
            .action(this.listCommand);


        configCmd.command("variables")
            .description("Commands related to variable configs")
            .command("list")
            .description("Command to list versioned variables of packages")
            .option("--json", "Return response as json type", "")
            .option("--keysByVersion <keysByVersion...>", "Mapping of package keys and versions", "")
            .option("--keysByVersionFile <keysByVersionFile>", "Package keys by version mappings file path.", "")
            .action(this.variablesCommand);

        configCmd.command("export")
            .description("Command to export package configs")
            .requiredOption("--packageKeys <packageKeys...>", "Keys of packages to export")
            .option("--withDependencies", "Include variables and dependencies", "")
            .action(this.configCommmand);
        
        configCmd.command("import")
            .description("Command to import package configs")
            .option("--overwrite", "Flag to allow overwriting of packages")
            .requiredOption("-f, --file <file>", "Exported packages file (relative path)")
            .action(this.importCommand);

        configCmd.command("diff")
            .description("Command to diff configs of packages")
            .option("--hasChanges", "Flag to return only the information if the package has changes without the actual changes")
            .option("--json", "Return the response as a JSON file")
            .requiredOption("-f, --file <file>", "Exported packages file (relative or absolute path)")
            .action(this.diffCommand);

    }

    diffCommand(context: Context, command: Command, options: OptionValues) {
        //new ConfigCommand().diffPackages(cmd.file, cmd.hasChanges, cmd.json);
    }

    importCommand(context: Context, command: Command, options: OptionValues) {
        //new ConfigCommand().batchImportPackages(cmd.file, cmd.overwrite);
    }

    configCommmand(context: Context, command: Command, options: OptionValues) {
        //new ConfigCommand().batchExportPackages(cmd.packageKeys, cmd.withDependencies);
    }

    variablesCommand(context: Context, command: Command, options: OptionValues) {
        //new ConfigCommand().listVariables(cmd.json, cmd.keysByVersion, cmd.keysByVersionFile);
    }

    listCommand(context: Context, command: Command, options: OptionValues) {
        //new ConfigCommand().listActivePackages(cmd.json, cmd.flavors, cmd.withDependencies, cmd.packageKeys);
    }

    showHelp(context: Context, command: Command) {
        command.outputHelp();
    }
}

export = PacManModule;