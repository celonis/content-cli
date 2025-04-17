/**
 * Commands to create and list access profiles.
 */

import { Command } from "commander";
import { CommandConfig, IModule } from "../../core/ModuleHandler";
import { logger } from "../../util/logger";
import { Context } from "../../core/Context";
import { SpaceCommand } from "../../commands/space.command";

class ListModule implements IModule {

    register(context: Context, command: CommandConfig) {
        
        // action if no command is provided
        command.action(this.showHelp);

        // let's add a subcommand
        command.command("spaces")
                .description("Command to list all spaces")
                .option("--json", "Return response as json type", "")
                .action(this.listSpaces);
                
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