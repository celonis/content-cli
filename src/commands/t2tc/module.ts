import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { T2tcCommandService } from "./t2tc-command.service";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        const t2tcCommand = configurator.command("t2tc")
            .description("Team-to-Team Copy (T2TC) commands for moving whole packages and their dependencies between teams using the batch transport archive format.");

        const t2tcPackageCommand = t2tcCommand.command("package")
            .description("Team-to-Team Copy package commands: list, export, import and diff packages using the batch transport archive.");

        t2tcPackageCommand.command("list")
            .description("List packages in the target team. Part of the Team-to-Team Copy export/import workflow.")
            .option("--json", "Return response as json type", "")
            .option("--flavors <flavors...>", "Lists only packages of the given flavors")
            .option("--withDependencies", "Include dependencies", "")
            .option("--packageKeys <packageKeys...>", "Lists only active versions of given package keys")
            .option("--keysByVersion <keysByVersion...>", "Lists packages by given key and version [packageKey.version]")
            .option("--variableValue <variableValue>", "Variable value for filtering packages by.")
            .option("--variableType <variableType>", "Variable type for filtering packages by.")
            .option("--branches", "Include branches", false)
            .option("--staging", "List staging packages instead", false)
            .action(this.listPackages);

        t2tcPackageCommand.command("export")
            .description("Export one or more packages into a Team-to-Team Copy archive. The archive is consumed by 't2tc package import' / 't2tc package diff'. To export a single standalone package, use 'config package export'.")
            .option("--packageKeys <packageKeys...>", "Keys of packages to export. Exports the latest deployed version only")
            .option("--keysByVersion <keysByVersion...>", "Keys of packages to export by version")
            .option("--withDependencies", "Include variables and dependencies", "")
            .option("--unzip", "Unzip the exported file", "")
            .option("--gitProfile <gitProfile>", "Git profile which you want to use for the Git operations")
            .option("--gitBranch <gitBranch>", "Git branch in which you want to push the exported file")
            .action(this.batchExportPackages);

        t2tcPackageCommand.command("import")
            .description("Import packages from a Team-to-Team Copy archive produced by 't2tc package export'. To import a single standalone package, use 'config package import'.")
            .option("--overwrite", "Flag to allow overwriting of packages")
            .option("--validate", "Validate node configurations before import", false)
            .option("--gitProfile <gitProfile>", "Git profile which you want to use for the Git operations")
            .option("--gitBranch <gitBranch>", "Git branch from which you want to pull the exported file and import")
            .option("-f, --file <file>", "Exported packages file (relative path)")
            .option("-d, --directory <directory>", "Exported packages directory (relative path)")
            .action(this.batchImportPackages);

        t2tcPackageCommand.command("diff")
            .description("Diff a local Team-to-Team Copy archive (from 't2tc package export') against deployed or staging packages.")
            .option("--hasChanges", "Flag to return only the information if the package has changes without the actual changes")
            .option("--baseVersion <version>", "Compare against a given version or STAGING")
            .option("--json", "Return the response as a JSON file")
            .requiredOption("-f, --file <file>", "Exported packages file (relative or absolute path)")
            .action(this.diffPackages);
    }

    private async listPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        if (options.staging && (options.withDependencies || options.packageKeys || options.keysByVersion || options.variableValue || options.variableType)) {
            throw new Error("Staging parameter is not compatible with --withDependencies, --packageKeys, --keysByVersion, --variableValue, --variableType");
        }
        if (options.packageKeys && options.keysByVersion) {
            throw new Error("Please provide either --packageKeys or --keysByVersion, but not both.");
        }

        await new T2tcCommandService(context).listPackages(
            options.json,
            options.flavors,
            options.withDependencies,
            options.packageKeys,
            options.keysByVersion,
            options.variableValue,
            options.variableType,
            options.branches,
            options.staging);
    }

    private async batchExportPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        if ((options.packageKeys && options.keysByVersion) || (!options.packageKeys && !options.keysByVersion)) {
            throw new Error("Please provide either --packageKeys or --keysByVersion, but not both.");
        }
        if (options.gitProfile && !options.gitBranch) {
            throw new Error("Please specify a branch using --gitBranch when using a Git profile.");
        }
        options.withDependencies = options.withDependencies ?? false;
        await new T2tcCommandService(context).batchExportPackages(options.packageKeys, options.keysByVersion, options.withDependencies, options.gitBranch, options.unzip);
    }

    private async batchImportPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        if (options.gitProfile && !options.gitBranch) {
            throw new Error("Please specify a branch using --gitBranch when using a Git profile.");
        }
        await new T2tcCommandService(context).batchImportPackages(options.file, options.directory, options.overwrite, options.gitBranch, options.validate);
    }

    private async diffPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new T2tcCommandService(context).diffPackages(options.file, options.hasChanges, options.baseVersion, options.json);
    }
}

export = Module;
