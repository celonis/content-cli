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
        pullCommand
            .command("view-bookmarks")
            .description("Command to pull view bookmarks")
            .option("--type <type>", "Type of view bookmarks to pull: USER (default), SHARED, or ALL")
            .requiredOption("--rootNodeKeyWithBoardKey <rootNodeKeyWithBoardKey>", "Root node key of the package the view (board) belongs to")
            .requiredOption("--key <key>", "Stable node key of the view (board) to pull bookmarks from")
            .action(this.pullViewBookmarks);

        const pushCommand = configurator.command("push");
        pushCommand
            .command("view-bookmarks")
            .description("Command to push view bookmarks to a board")
            .requiredOption("--rootNodeKeyWithBoardKey <rootNodeKeyWithBoardKey>", "Root node key of the package the view (board) belongs to")
            .requiredOption("--key <key>", "Stable node key of the view (board) to push bookmarks into")
            .requiredOption("-f, --file <file>", "The file to push")
            .action(this.pushViewBookmarks);
    }

    private async pullViewBookmarks(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ViewBookmarksCommandService(context).pullViewBookmarks(options.rootNodeKeyWithBoardKey, options.key, options.type);
    }

    private async pushViewBookmarks(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ViewBookmarksCommandService(context).pushViewBookmarks(options.rootNodeKeyWithBoardKey, options.key, options.file);
    }
}

export = Module;
