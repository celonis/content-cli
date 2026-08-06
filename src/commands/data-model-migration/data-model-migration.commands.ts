import { Context } from "../../core/command/cli-context";
import { Configurator } from "../../core/command/module-handler";
import { Command, OptionValues } from "commander";
import { DataModelMigrationCommandService } from "./data-model-migration-command.service";

export class DataModelMigrationCommands {

    public register(_context: Context, configurator: Configurator): void {
        configurator.command("export")
            .command("data-model")
            .description("Export a data model with tables, foreign keys, and process configurations")
            .requiredOption("--poolId <poolId>", "ID of the data pool")
            .requiredOption("--dataModelId <dataModelId>", "ID of the data model")
            .option("--outputToJsonFile", "Write the exported data model to a JSON file")
            .action(this.exportDataModel);

        configurator.command("push")
            .command("semantic-model")
            .description("Convert a data model into semantic entities and push them into a pig package")
            .requiredOption("--package <packageKey>", "Target pig package key")
            .option("--poolId <poolId>", "ID of the data pool (required unless --fromFile is set)")
            .option("--dataModelId <dataModelId>", "ID of the data model (required unless --fromFile is set)")
            .option("--schema <schema>", "Physical lake schema for data bindings (overrides pool-derived default)")
            .option("--namespace <namespace>", "Namespace for created semantic entities")
            .option("-f, --fromFile <file>", "Use a previously exported data model transport JSON file")
            .option("--dryRun", "Convert only; print or write node payloads without pushing to Pacman")
            .option("--outputToJsonFile", "With --dryRun, write conversion output to a JSON file")
            .action(this.pushSemanticModel);
    }

    private async exportDataModel(context: Context, _command: Command, options: OptionValues): Promise<void> {
        await new DataModelMigrationCommandService(context).exportDataModel(
            options.poolId,
            options.dataModelId,
            !!options.outputToJsonFile
        );
    }

    private async pushSemanticModel(context: Context, _command: Command, options: OptionValues): Promise<void> {
        if (!options.fromFile && (!options.poolId || !options.dataModelId)) {
            throw new Error("Either --fromFile or both --poolId and --dataModelId are required");
        }

        await new DataModelMigrationCommandService(context).pushSemanticModel({
            poolId: options.poolId,
            dataModelId: options.dataModelId,
            packageKey: options.package,
            schema: options.schema,
            namespace: options.namespace,
            fromFile: options.fromFile,
            dryRun: !!options.dryRun,
            outputToJsonFile: !!options.outputToJsonFile,
        });
    }
}
