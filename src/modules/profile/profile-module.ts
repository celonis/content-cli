/**
 * Commands to create and list access profiles.
 */

import { Command } from "commander";
import { CommandConfig, Configurator, IModule } from "../../core/module-handler";
import { logger } from "../../util/logger";
import { Context } from "../../core/cli-context";
import { ProfileCommand } from "./profile.command";

class ProfileModule implements IModule {

    register(context: Context, configurator: Configurator) {
        
        let command = configurator.command('profile');
        command.description('Manage profiles required to access a system.');
        
        // action if no command is provided
        command.action(this.showHelp);

        // let's add a subcommand
        command.command("list")
                .description("Command to list all stored profiles")
                .action(this.listProfiles);

        command.command("create")
                .description("Command to create a new profile")
                .option("--setAsDefault", "Set this profile as default")
                .action(this.createProfile);

        command.command("default <profile>")
                .description("Command to set a profile as default")
                .action(this.defaultProfile);
                
    }

    async defaultProfile(context: Context, command: Command) {
        let profile = command.args[0];
        await new ProfileCommand().makeDefaultProfile(profile);
    }

    async createProfile(context: Context, command: Command) {
        let options = command.opts();
        await new ProfileCommand().createProfile(options.setAsDefault);
    }

    async listProfiles(context: Context, command: Command) {
        logger.debug(`List profiles`);
        await new ProfileCommand().listProfiles();
    }

    showHelp(context: Context, command: Command) {
        command.outputHelp();
    }
}

export = ProfileModule;