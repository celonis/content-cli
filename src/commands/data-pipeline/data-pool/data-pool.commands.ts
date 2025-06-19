/**
 * Commands related to the Data Pools.
 */
import { Context } from "../../../core/command/cli-context";
import { Configurator } from "../../../core/command/module-handler";
import { Command, OptionValues } from "commander";
import { DataPoolCommandService } from "./data-pool-command.service";

export class DataPoolCommands {

    public register(context: Context, configurator: Configurator): void {
        const exportCommand = configurator.command("export");
        exportCommand.command("data-pool")
            .description("Command to export a data pool")
            .requiredOption("--id <id>", "ID of the data pool you want to export")
            .option("--outputToJsonFile", "Output the exported data pool to a JSON file")
            .action(this.exportDataPool);

        const importCommand = configurator.command("import");
        importCommand.command("data-pools")
            .description("Command to batch import multiple data pools with their objects and dependencies")
            .requiredOption("-f, --jsonFile <file>", "The file with the JSON data pool batch import request")
            .option("--outputToJsonFile", "Output the batch import result in a JSON file")
            .action(this.batchImportDataPools);

        const listCommand = configurator.command("list");
        listCommand.command("data-pools")
            .description("Command to list all Data Pools")
            .option("--json", "Return response as json type", "")
            .action(this.listDataPools);

        const pullCommand = configurator.command("pull");
        pullCommand.command("data-pool")
            .description("Command to pull a data pool")
            .requiredOption("--id <id>", "Id of the data pool you want to pull")
            .action(this.pullDataPool);

        const pushCommand = configurator.command("push");
        pushCommand.command("data-pool")
            .description("Command to push a data pool")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(this.pushDataPool);

        pushCommand.command("data-pools")
            .description("Command to push data pools")
            .action(this.pushDataPools);

        const updateCommand = configurator.command("update");
        updateCommand.command("data-pool")
            .description("Command to update a data pool using a data pool configuration file")
            .requiredOption("--id <id>", "Id of the data pool you want to update")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(this.updateDataPool);
    }

    private async exportDataPool(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new DataPoolCommandService(context).exportDataPool(options.id, options.outputToJsonFile);
    }

    private async batchImportDataPools(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new DataPoolCommandService(context).batchImportDataPools(options.jsonFile, options.outputToJsonFile);
    }

    private async listDataPools(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new DataPoolCommandService(context).listDataPools(options.json);
    }

    private async pullDataPool(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new DataPoolCommandService(context).pullDataPool(options.id);
    }

    private async pushDataPool(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new DataPoolCommandService(context).pushDataPool(options.file);
    }

    private async pushDataPools(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new DataPoolCommandService(context).pushDataPools();
    }

    private async updateDataPool(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new DataPoolCommandService(context).updateDataPool(options.id, options.file);
    }
}
