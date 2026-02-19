/**
 * Commands to create and list access profiles.
 */

import { Command, OptionValues } from "commander";
import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { GitProfileCommandService } from "./git-profile-command.service";
import { logger } from "../../core/utils/logger";

class Module extends IModule {
  public register(context: Context, configurator: Configurator): void {
    const gitCommand = configurator
      .command("git")
      .description("Commands related to Git settings");

    const gitProfileCommand = gitCommand
      .command("profile")
      .description(
        "Manage Git profiles required to use git-related operations.",
      );

    gitProfileCommand
      .command("list")
      .description("Command to list all stored Git profiles")
      .action(this.listProfiles);

    gitProfileCommand
      .command("create")
      .description("Command to create a new Git profile")
      .option("--setAsDefault", "Set this Git profile as default")
      .action(this.createProfile);

    gitProfileCommand
      .command("default <profile>")
      .description("Command to set a Git profile as default")
      .action(this.defaultProfile);
  }

  private async defaultProfile(
    context: Context,
    command: Command,
  ): Promise<void> {
    const profile = command.args[0];
    await new GitProfileCommandService().makeDefaultProfile(profile);
  }

  private async createProfile(
    context: Context,
    command: Command,
    options: OptionValues,
  ): Promise<void> {
    await new GitProfileCommandService().createProfile(options.setAsDefault);
  }

  private async listProfiles(
    context: Context,
    command: Command,
  ): Promise<void> {
    await new GitProfileCommandService().listProfiles();
  }
}

export = Module;
