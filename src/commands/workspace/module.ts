import { Command, OptionValues } from "commander";
import { Context } from "../../core/command/cli-context";
import { Configurator, IModule } from "../../core/command/module-handler";
import { WorkspaceService } from "./workspace.service";

async function runWorkspaceCommand<T>(action: () => Promise<T> | T): Promise<void> {
    try {
        await action();
    } catch (error) {
        process.exitCode = 1;
        throw error;
    }
}

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

        workspace.command("pull [paths...]").beta().description("Pull remote changes.").action(this.pull);

        workspace.command("status [directory]").beta().description("Show local changes.").action(this.status);

        workspace
            .command("push [paths...]")
            .beta()
            .description("Push local changes.")
            .option("--asset-type <assetType>", "Asset Type for new files")
            .action(this.push);

        workspace
            .command("move <source> <target>")
            .beta()
            .description("Move a tracked file to another parent.")
            .option("--record", "Record an existing move", false)
            .action(this.move);
    }

    private async clone(context: Context, command: Command, options: OptionValues): Promise<void> {
        await runWorkspaceCommand(() =>
            new WorkspaceService(context).clone(command.args[0], command.args[1], { branch: options.branch })
        );
    }

    private async checkout(context: Context, command: Command, options: OptionValues): Promise<void> {
        await runWorkspaceCommand(async () => {
            const branch = options.create || command.args[0];
            if (!branch || (options.create && command.args[0])) {
                throw new Error("Provide one branch name or use -b <branch>.");
            }
            await new WorkspaceService(context).checkout(branch, {
                create: Boolean(options.create),
                discard: options.discard,
                linkGit: options.linkGit,
            });
        });
    }

    private async pull(context: Context, command: Command): Promise<void> {
        await runWorkspaceCommand(() => new WorkspaceService(context).pull(command.args));
    }

    private async status(context: Context, command: Command): Promise<void> {
        await runWorkspaceCommand(() => new WorkspaceService(context).statusWithGit(command.args[0]));
    }

    private async push(context: Context, command: Command, options: OptionValues): Promise<void> {
        await runWorkspaceCommand(() =>
            new WorkspaceService(context).push(command.args, {
                assetType: options.assetType,
            })
        );
    }

    private async move(context: Context, command: Command, options: OptionValues): Promise<void> {
        await runWorkspaceCommand(() =>
            new WorkspaceService(context).move(command.args[0], command.args[1], options.record)
        );
    }
}

export = Module;
