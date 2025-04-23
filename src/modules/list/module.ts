/**
 * Commands to create and list access profiles.
 */

import { Command } from "commander";
import { CommandConfig, Configurator, IModule } from "../../core/module-handler";
import { logger } from "../../util/logger";
import { Context } from "../../core/cli-context";
import { SpaceCommand } from "../../commands/space.command";
import { ListCommand } from "./list-commands";

class ListModule implements IModule {

    register(context: Context, configurator: Configurator) {
        
        let command = configurator.command('list');
        // action if no command is provided
        command.action(this.showHelp);

        // let's add a subcommand
        command.command("packages")
                .description("Command to list all packages")
                .option("--json", "Return response as json type", "")
                .option("--includeDependencies", "Include variables and dependencies", "")
                .option("--packageKeys <packageKeys...>", "Lists only given package keys")
                .action(this.listPackages);

        command.command("spaces")
                .description("Command to list all spaces")
                .option("--json", "Return response as json type", "")
                .action(this.listSpaces);
                
    }

    async listPackages(context: Context, command: Command) {
        let options = command.opts();
        await new ListCommand(context).listPackages(options.json, options.includeDependencies, options.packageKeys);
    }

    async listSpaces(context: Context, command: Command) {
        let options = command.opts();
        await new SpaceCommand().listSpaces(undefined, options.json);
    }


    showHelp(context: Context, command: Command) {
        command.outputHelp();
    }
}

export = ListModule;