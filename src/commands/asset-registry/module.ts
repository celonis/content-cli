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
            .option("--flavor <flavor>", "Lists only the asset types that apply to the given package flavor (e.g., STUDIO)")
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
            .option("--path <path>", "Return only this part of the schema, written like a $ref inside it (e.g., '#/$defs/table'); '#' returns the entry point")
            .option("--json", "Return the response as a JSON file")
            .action(this.getSchema);

        assetRegistryCommand.command("examples")
            .description("Get example configurations for an asset type")
            .requiredOption("--assetType <assetType>", "The asset type identifier (e.g., BOARD_V2)")
            .option("--json", "Return the response as a JSON file")
            .action(this.getExamples);
    }

    private async listTypes(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).listTypes(!!options.json, options.flavor);
    }

    private async getType(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).getType(options.assetType, !!options.json);
    }

    private async getSchema(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).getSchema(options.assetType, !!options.json, options.path);
    }

    private async getExamples(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).getExamples(options.assetType, !!options.json);
    }
}

export = Module;
