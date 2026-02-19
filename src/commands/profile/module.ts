/**
 * Commands to create and list access profiles.
 */

import {Command, OptionValues} from "commander";
import {Configurator, IModule} from "../../core/command/module-handler";
import {logger} from "../../core/utils/logger";
import {Context} from "../../core/command/cli-context";
import {ProfileCommandService} from "./profile-command.service";

class Module extends IModule {
    public register(context: Context, configurator: Configurator): void {
        const command = configurator.command("profile").description("Manage profiles required to access a system.");

        command.command("list").description("Command to list all stored profiles").action(this.listProfiles);

        command
            .command("create")
            .description("Command to create a new profile")
            .option("--setAsDefault", "Set this profile as default")
            .action(this.createProfile);

        command
            .command("default <profile>")
            .description("Command to set a profile as default")
            .action(this.defaultProfile);
    }

    private async defaultProfile(context: Context, command: Command): Promise<void> {
        const profile = command.args[0];
        await new ProfileCommandService().makeDefaultProfile(profile);
    }

    private async createProfile(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ProfileCommandService().createProfile(options.setAsDefault);
    }

    private async listProfiles(context: Context, command: Command): Promise<void> {
        logger.debug("List profiles");
        await new ProfileCommandService().listProfiles();
    }
}

export = Module;
