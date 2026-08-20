import { Command, OptionValues } from "commander";
import { Context } from "../../core/command/cli-context";
import { Configurator, IModule } from "../../core/command/module-handler";
import { WorkspaceService } from "./workspace.service";

class Module extends IModule {
    public register(context: Context, configurator: Configurator): void {
        const workspace = configurator.command("workspace").beta().description("Manage a package workspace.");

        workspace
            .command("clone <projectKey> [directory]")
            .beta()
            .description("Clone a package workspace.")
            .option("--branch <branch>", "Clone a branch")
            .action(this.clone);

        workspace
            .command("checkout [branch]")
            .beta()
            .description("Select a package branch.")
            .option("-b, --create <branch>", "Create and select a branch")
            .option("--discard", "Discard local workspace changes", false)
            .option("--link-git", "Map the current Git branch", false)
            .action(this.checkout);

        workspace
            .command("pull [paths...]")
            .beta()
            .description("Pull remote changes.")
            .option("--full", "Pull and replace from the full workspace archive", false)
            .action(this.pull);

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

    private async clone(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new WorkspaceService(context).clone(command.args[0], command.args[1], { branch: options.branch });
    }

    private async checkout(context: Context, command: Command, options: OptionValues): Promise<void> {
        const branch = options.create || command.args[0];
        if (!branch || (options.create && command.args[0])) {
            throw new Error("Provide one branch name or use -b <branch>.");
        }
        await new WorkspaceService(context).checkout(branch, {
            create: Boolean(options.create),
            discard: options.discard,
            linkGit: options.linkGit,
        });
    }

    private async pull(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new WorkspaceService(context).pull(command.args, { full: options.full });
    }

    private async status(context: Context, command: Command): Promise<void> {
        await new WorkspaceService(context).statusWithGit(command.args[0]);
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
