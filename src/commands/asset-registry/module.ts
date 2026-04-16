import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { AssetRegistryService } from "./asset-registry.service";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        const assetRegistryCommand = configurator.command("asset-registry")
            .description("Manage the asset registry — discover registered asset types and their service descriptors.");

        assetRegistryCommand.command("list")
            .description("List all registered asset types")
            .option("--json", "Return the response as a JSON file")
            .action(this.listTypes);

        assetRegistryCommand.command("get")
            .description("Get the descriptor for a specific asset type")
            .requiredOption("--assetType <assetType>", "The asset type identifier (e.g., BOARD_V2)")
            .option("--json", "Return the response as a JSON file")
            .action(this.getType);

        assetRegistryCommand.command("schema")
            .description("Get the JSON schema for an asset type's configuration")
            .requiredOption("--assetType <assetType>", "The asset type identifier (e.g., BOARD_V2)")
            .option("--json", "Return the response as a JSON file")
            .action(this.getSchema);

        assetRegistryCommand.command("examples")
            .description("Get example configurations for an asset type")
            .requiredOption("--assetType <assetType>", "The asset type identifier (e.g., BOARD_V2)")
            .option("--json", "Return the response as a JSON file")
            .action(this.getExamples);

        assetRegistryCommand.command("methodology")
            .description("Get the methodology / best-practices guide for an asset type")
            .requiredOption("--assetType <assetType>", "The asset type identifier (e.g., BOARD_V2)")
            .option("--json", "Return the response as a JSON file")
            .action(this.getMethodology);
    }

    private async listTypes(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).listTypes(!!options.json);
    }

    private async getType(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).getType(options.assetType, !!options.json);
    }

    private async getSchema(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).getSchema(options.assetType, !!options.json);
    }

    private async getExamples(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).getExamples(options.assetType, !!options.json);
    }

    private async getMethodology(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).getMethodology(options.assetType, !!options.json);
    }
}

export = Module;
