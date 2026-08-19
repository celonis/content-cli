import { Command, OptionValues } from "commander";
import { Context } from "../../core/command/cli-context";
import { Configurator, IModule } from "../../core/command/module-handler";
import { WorkspaceService } from "./workspace.service";

class Module extends IModule {
    public register(context: Context, configurator: Configurator): void {
        const workspace = configurator.command("workspace").beta().description("Manage a package workspace.");

        workspace
            .command("checkout <packageKey> [directory]")
            .beta()
            .description("Check out a package.")
            .action(this.checkout);

        workspace.command("status [directory]").beta().description("Show local changes.").action(this.status);

        workspace
            .command("push [directory]")
            .beta()
            .description("Push local changes.")
            .option("--overwrite", "Replace missing remote files", false)
            .action(this.push);

        workspace
            .command("move <source> <target>")
            .beta()
            .description("Move a tracked file.")
            .option("--record", "Record an existing move", false)
            .action(this.move);
    }

    private async checkout(context: Context, command: Command): Promise<void> {
        await new WorkspaceService(context).checkout(command.args[0], command.args[1]);
    }

    private async status(context: Context, command: Command): Promise<void> {
        new WorkspaceService(context).status(command.args[0]);
    }

    private async push(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new WorkspaceService(context).push(command.args[0], options.overwrite);
    }

    private async move(context: Context, command: Command, options: OptionValues): Promise<void> {
        new WorkspaceService(context).move(command.args[0], command.args[1], options.record);
    }
}

export = Module;
