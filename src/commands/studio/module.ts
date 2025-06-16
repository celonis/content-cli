/**
 * Commands related to the Studio area.
 */

import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { PackageCommandService } from "./command-service/package-command.service";
import { AssetCommandService } from "./command-service/asset-command.service";
import { WidgetCommand } from "./command-service/widget.command";
import { SpaceCommandService } from "./command-service/space-command.service";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        const exportCommand = configurator.command("export");
        exportCommand.command("packages")
            .description("Command to export all given packages")
            .requiredOption("--packageKeys <packageKeys...>", "Exports only given package keys")
            .option("--includeDependencies", "Include variables and dependencies", "")
            .option("--excludeActionFlows", "Don't export action flows")
            .action(this.batchExportPackages);

        const importCommand = configurator.command("import");
        importCommand.command("packages")
            .description("Command to import all given packages")
            .option(
                "--spaceMappings <spaceMappings...>",
                "List of mappings for importing packages to different target spaces. Mappings should follow format 'packageKey:targetSpaceKey'"
            )
            .option("--overwrite", "Flag to allow overwriting of packages")
            .option("--excludeActionFlows", "Skip overwrite of action flows of package")
            .option("--dataModelMappingsFile <dataModelMappingsFile>", "DataModel variable mappings file path. If missing, variables will be mapped from manifest file.")
            .requiredOption("-f, --file <file>", "Exported packages file (relative path)")
            .action(this.batchImportPackages);

        const listCommand = configurator.command("list");
        listCommand.command("packages")
            .description("Command to list all packages")
            .option("--json", "Return response as json type", "")
            .option("--includeDependencies", "Include variables and dependencies", "")
            .option("--packageKeys <packageKeys...>", "Lists only given package keys")
            .action(this.listPackages);

        listCommand.command("spaces")
            .description("Command to list all spaces")
            .option("--json", "Return response as json type", "")
            .action(this.listSpaces);

        listCommand.command("assets")
            .description("Command to list all assets")
            .option("--json", "Return response as json type", "")
            .option("--assetType <assetType>", "type of assets")
            .action(this.listAssets);

        const pullCommand = configurator.command("pull");
        pullCommand.command("asset")
            .description("Command to pull an asset from Studio")
            .requiredOption("--key <key>", "Key of asset you want to pull")
            .action(this.pullAsset);

        pullCommand.command("package")
            .description("Command to pull a package")
            .requiredOption("--key <key>", "Key of the package you want to pull")
            .option("--store", "Pull package with store deployment metadata")
            .option("--newKey <newKey>", "Define a new key for your package")
            .option("--draft", "Pull draft version of package")
            .action(this.pullPackage);

        const pushCommand = configurator.command("push");
        pushCommand.command("asset")
            .description("Command to push an asset to Studio")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .requiredOption("--package <packageKey>", "Key of the package you want to push asset to")
            .action(this.pushAsset);

        pushCommand.command("assets")
            .description("Command to push assets to Studio")
            .requiredOption("--package <packageKey>", "Key of the package you want to push assets to")
            .action(this.pushAssets);

        pushCommand.command("package")
            .description("Command to push a package to Studio")
            .option("--newKey <newKey>", "Define a new key for your package")
            .option("--overwrite", "Overwrite package and its assets")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .requiredOption("--spaceKey <spaceKey>", "The key of the destination space")
            .action(this.pushPackage);

        pushCommand.command("packages")
            .description("Command to push packages to Studio")
            .requiredOption("--spaceKey <spaceKey>", "The key of the destination space")
            .action(this.pushPackages);

        pushCommand.command("widget")
            .description("Command to push a widget")
            .option("--tenantIndependent", "Upload widget tenant independently")
            .option("--userSpecific", "Upload widget only for the user in the provided api token")
            .option("--packageManager", "Upload widget to package manager (deprecated)") // Deprecated
            .action(this.pushWidget);
    }

    private async batchExportPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new PackageCommandService(context).batchExportPackages(options.packageKeys, options.includeDependencies, options.excludeActionFlows ?? false);
    }

    private async batchImportPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new PackageCommandService(context).batchImportPackages(options.spaceMappings, options.dataModelMappingsFile, options.file, options.overwrite, options.excludeActionFlows);
    }

    private async listPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new PackageCommandService(context).listPackages(options.json, options.includeDependencies, options.packageKeys);
    }

    private async listSpaces(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new SpaceCommandService(context).listSpaces(options.json);
    }

    private async listAssets(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetCommandService(context).listAssets(options.json, options.assetType);
    }

    private async pullAsset(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetCommandService(context).pullAsset(options.key);
    }

    private async pullPackage(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new PackageCommandService(context).pullPackage(options.key, !!options.store, options.newKey, !!options.draft);
    }

    private async pushAsset(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetCommandService(context).pushAsset(options.file, options.package);
    }

    private async pushAssets(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetCommandService(context).pushAssets(options.package);
    }

    private async pushPackage(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new PackageCommandService(context).pushPackage(options.spaceKey, options.file, options.newKey, options.overwrite);
    }

    private async pushPackages(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new PackageCommandService(context).pushPackages(options.spaceKey);
    }

    private async pushWidget(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new WidgetCommand(context).pushWidget(!!options.tenantIndependent, !!options.userSpecific);
    }
}

export = Module;