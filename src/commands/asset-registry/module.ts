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

        assetRegistryCommand.command("validate")
            .description("Validate asset configuration against the asset service's validate endpoint.")
            .requiredOption("--assetType <assetType>", "The asset type identifier (e.g., BOARD_V2)")
            .option("--packageKey <packageKey>", "Package key. Required when validating with --nodeKey or --configuration.")
            .option("--nodeKey <nodeKey>", "Key of an already-stored node to validate (use with --packageKey).")
            .option("--configuration <configuration>", "Inline JSON of a configuration to validate (use with --packageKey).")
            .option("-f, --file <file>", "Path to a JSON file containing a full ValidateRequest body. Mutually exclusive with the build-from-options flags.")
            .option("--json", "Return the response as a JSON file")
            .action(this.validate);

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

    private async validate(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).validate({
            assetType: options.assetType,
            packageKey: options.packageKey,
            nodeKey: options.nodeKey,
            configuration: options.configuration,
            file: options.file,
            json: !!options.json,
        });
    }

    private async getExamples(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).getExamples(options.assetType, !!options.json);
    }

    private async getMethodology(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).getMethodology(options.assetType, !!options.json);
    }
}

export = Module;
