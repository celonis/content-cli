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

        const skillsCommand = assetRegistryCommand.command("skills")
            .description("Discover agent skills exposed by the asset registry");

        skillsCommand.command("list")
            .description("List all available agent skills (name, description, path)")
            .option("--json", "Return the response as a JSON file")
            .action(this.listSkills);

        skillsCommand.command("get")
            .description("Download a skill file (defaults to SKILL.md)")
            .requiredOption("--path <path>", "Skill path from 'skills list' (e.g. platform/<skill> or asset/<assetType>/<skill>)")
            .option("--file <file>", "Relative path of a reference file within the skill (defaults to SKILL.md)")
            .option("--output <output>", "Destination directory (defaults to current working directory)")
            .action(this.getSkillFile);

        skillsCommand.command("download")
            .description("Download an entire skill (SKILL.md and all reference files) into a new directory, preserving folder structure. Existing files are overwritten.")
            .requiredOption("--path <path>", "Skill path from 'skills list' (e.g. platform/<skill> or asset/<assetType>/<skill>)")
            .option("--output <output>", "Parent directory in which the skill directory will be created (defaults to current working directory)")
            .action(this.downloadSkill);
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

    private async listSkills(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).listSkills(!!options.json);
    }

    private async getSkillFile(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).getSkillFile({
            path: options.path,
            file: options.file,
            output: options.output,
        });
    }

    private async downloadSkill(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new AssetRegistryService(context).downloadSkill({
            path: options.path,
            output: options.output,
        });
    }
}

export = Module;
