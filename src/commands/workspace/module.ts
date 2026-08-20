import { Command, OptionValues } from "commander";
import { Context } from "../../core/command/cli-context";
import { Configurator, IModule } from "../../core/command/module-handler";
import { WorkspaceService } from "./workspace.service";

class Module extends IModule {
    public register(context: Context, configurator: Configurator): void {
        const workspace = configurator.command("workspace").beta().description("Manage a package workspace.");

        workspace.command("clone <packageKey> [directory]").beta().description("Clone a package.").action(this.clone);

        workspace.command("pull [directory]").beta().description("Pull remote changes.").action(this.pull);

        workspace.command("status [directory]").beta().description("Show local changes.").action(this.status);

        workspace
            .command("push [paths...]")
            .beta()
            .description("Push local changes.")
            .option("--full", "Push the full workspace archive", false)
            .option("--overwrite", "Replace missing remote files during a full push", false)
            .action(this.push);

        workspace
            .command("move <source> <target>")
            .beta()
            .description("Move a tracked file.")
            .option("--record", "Record an existing move", false)
            .action(this.move);
    }

    private async clone(context: Context, command: Command): Promise<void> {
        await new WorkspaceService(context).clone(command.args[0], command.args[1]);
    }

    private async pull(context: Context, command: Command): Promise<void> {
        await new WorkspaceService(context).pull(command.args[0]);
    }

    private async status(context: Context, command: Command): Promise<void> {
        new WorkspaceService(context).status(command.args[0]);
    }

    private async push(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new WorkspaceService(context).push(command.args, {
            full: options.full,
            overwrite: options.overwrite,
        });
    }

    private async move(context: Context, command: Command, options: OptionValues): Promise<void> {
        new WorkspaceService(context).move(command.args[0], command.args[1], options.record);
    }
}

export = Module;
