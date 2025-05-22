/**
 * Commands related to the Analysis feature.
 */

import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { AnalysisBookmarksCommandService } from "./analysis-bookmarks-command.service";

class Module extends IModule {

    register(context: Context, configurator: Configurator) {
        const pullCommand = configurator.command("pull");
        pullCommand.command("bookmarks")
            .description("Command to pull an analysis bookmarks")
            .option("-p, --profile <profile>", "Profile which you want to use to pull the analysis bookmarks")
            .option("--type <type>", "Pull shared/all Analysis Bookmarks, else by default get user bookmarks")
            .requiredOption("--id <id>", "Id of the analysis you want to pull")
            .action(this.pullAnalysisBookmarks);

        const pushCommand = configurator.command("push");
        pushCommand.command("bookmarks")
            .description("Command to push an analysis to a workspace")
            .option("-p, --profile <profile>", "Profile which you want to use to push the analysis")
            .requiredOption("--id <id>", "Id of the Analysis to which you want to push the analysis bookmarks")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(this.pushAnalysisBookmarks);
    }

    private async pullAnalysisBookmarks(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AnalysisBookmarksCommandService(context).pullAnalysisBookmarks(options.id, options.type);
    }

    private async pushAnalysisBookmarks(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AnalysisBookmarksCommandService(context).pushAnalysisBookmarks(options.id, options.file);
    }
}

export = Module;