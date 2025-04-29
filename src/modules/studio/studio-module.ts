/**
 * Commands to create and list access profiles.
 */

import { Command, OptionValues } from "commander";
import { CommandConfig, Configurator, IModule } from "../../core/module-handler";
import { logger } from "../../util/logger";
import { Context } from "../../core/cli-context";
import { SpaceCommand } from "../../commands/space.command";
import { ListCommand } from "./list-commands";

class ListModule implements IModule {

    register(context: Context, configurator: Configurator) {
        
        // Extend the "list" command with some studio specific options
        let listCmd = configurator.command('list');

        // let's add a subcommand
        listCmd.command("packages")
                .description("Command to list all packages")
                .option("--json", "Return response as json type", "")
                .option("--includeDependencies", "Include variables and dependencies", "")
                .option("--packageKeys <packageKeys...>", "Lists only given package keys")
                .action(this.listPackages);

        listCmd.command("spaces")
                .description("Command to list all spaces")
                .option("--json", "Return response as json type", "")
                .action(this.listSpaces);
                
    }

    async listPackages(context: Context, command: Command, options: OptionValues) {
        await new ListCommand(context).listPackages(options.json, options.includeDependencies, options.packageKeys);
    }

    async listSpaces(context: Context, command: Command, options: OptionValues) {
        await new SpaceCommand().listSpaces(undefined, options.json);
    }


    showHelp(context: Context, command: Command) {
        command.outputHelp();
    }
}

export = ListModule;