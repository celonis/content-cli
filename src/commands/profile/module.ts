/**
 * Commands to create and list access profiles.
 */

import { Command, OptionValues } from "commander";
import { Configurator, IModule } from "../../core/command/module-handler";
import { logger } from "../../core/utils/logger";
import { Context } from "../../core/command/cli-context";
import { ProfileCommandService } from "./profile-command.service";

class Module extends IModule {

    register(context: Context, configurator: Configurator) {

        let command = configurator.command("profile");
        command.description("Manage profiles required to access a system.");

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
        await new ProfileCommandService().makeDefaultProfile(profile);
    }

    async createProfile(context: Context, command: Command, options: OptionValues) {
        await new ProfileCommandService().createProfile(options.setAsDefault);
    }

    async listProfiles(context: Context, command: Command) {
        logger.debug(`List profiles`);
        await new ProfileCommandService().listProfiles();
    }
}

export = Module;