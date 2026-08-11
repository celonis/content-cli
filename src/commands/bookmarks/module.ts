import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { BookmarksCommandService } from "./bookmarks-command.service";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        const exportCommand = configurator.command("export");
        exportCommand.command("bookmarks")
            .description("Export bookmarks for a package")
            .requiredOption("--packageKey <packageKey>", "Key of the package to export bookmarks from")
            .option("-f, --file <file>", "Output file path (defaults to bookmarks-<packageKey>.json)")
            .action(this.exportBookmarks);

        const importCommand = configurator.command("import");
        importCommand.command("bookmarks")
            .description("Import bookmarks into a package")
            .requiredOption("--packageKey <packageKey>", "Key of the package to import bookmarks into")
            .requiredOption("-f, --file <file>", "Bookmarks JSON file to import")
            .action(this.importBookmarks);
    }

    private async exportBookmarks(context: Context, _command: Command, options: OptionValues): Promise<void> {
        await new BookmarksCommandService(context).exportBookmarks(options.packageKey, options.file);
    }

    private async importBookmarks(context: Context, _command: Command, options: OptionValues): Promise<void> {
        await new BookmarksCommandService(context).importBookmarks(options.packageKey, options.file);
    }
}

export = Module;
