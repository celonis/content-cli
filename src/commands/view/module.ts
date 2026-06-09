/**
 * Commands related to the View feature.
 */

import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { ViewBookmarksCommandService } from "./view-bookmarks-command.service";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        const pullCommand = configurator.command("pull");
        pullCommand.command("view-bookmarks")
            .description("Command to pull a view bookmarks")
            .option("--type <type>", "Pull SHARED/ALL View Bookmarks, else by default get USER bookmarks")
            .requiredOption("--id <id>", "Id of the view (board) you want to pull")
            .action(this.pullViewBookmarks);

        const pushCommand = configurator.command("push");
        pushCommand.command("view-bookmarks")
            .description("Command to push a view bookmarks to a board")
            .requiredOption("--id <id>", "Id of the view (board) to which you want to push the view bookmarks")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(this.pushViewBookmarks);
    }

    private async pullViewBookmarks(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ViewBookmarksCommandService(context).pullViewBookmarks(options.id, options.type);
    }

    private async pushViewBookmarks(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ViewBookmarksCommandService(context).pushViewBookmarks(options.id, options.file);
    }
}

export = Module;
