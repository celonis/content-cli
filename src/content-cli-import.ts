import * as commander from "commander";
import { Command } from "commander";
import { PackageCommand } from "./commands/package.command";
import { DataPoolCommand } from "./commands/data-pool.command";
import { ContextInitializer } from "./util/context-initializer";
import { logger } from "./util/logger";
import { ActionFlowCommand } from "./commands/action-flow.command";
import { program } from "./util/program";

export class Import {
    public static packages(program: Command): Command {
        program
            .command("packages")
            .description("Command to import all given packages")
            .option("-p, --profile <profile>", "Profile which you want to use to list packages")
            .option(
                "--spaceMappings <spaceMappings...>",
                "List of mappings for importing packages to different target spaces. Mappings should follow format 'packageKey:targetSpaceKey'"
            )
            .option("--overwrite", "Flag to allow overwriting of packages")
            .option("--excludeActionFlows", "Skip overwrite of action flows of package")
            .option("--dataModelMappingsFile <dataModelMappingsFile>", "DataModel variable mappings file path. If missing, variables will be mapped from manifest file.")
            .requiredOption("-f, --file <file>", "Exported packages file (relative path)")
            .action(async cmd => {
                await new PackageCommand().batchImportPackages(cmd.spaceMappings, cmd.dataModelMappingsFile, cmd.file, cmd.overwrite, cmd.excludeActionFlows);
                process.exit();
            });

        return program;
    }

    public static dataPools(program: Command): Command {
        program
            .command("data-pools")
            .description("Command to batch import multiple data pools with their objects and dependencies")
            .option("-p, --profile <profile>", "Profile which you want to use to import the data pools")
            .requiredOption("-f, --jsonFile <file>", "The file with the JSON data pool batch import request")
            .option("--outputToJsonFile", "Output the batch import result in a JSON file")
            .action(async cmd => {
                await new DataPoolCommand().batchImportDataPools(cmd.jsonFile, cmd.outputToJsonFile);
                process.exit();
            });

        return program;
    }

    public static actionFlows(program: Command): Command {
        program
            .command("action-flows")
            .description("Command to import all Action Flows in a package with their objects and dependencies")
            .option("-p, --profile <profile>", "Profile which you want to use to import Action Flows")
            .requiredOption("--packageId <packageId>", "ID of the package to which you want to export Action Flows")
            .requiredOption("-f, --file <file>", "Exported Action Flows file (relative path)")
            .requiredOption("-d, --dryRun <dryRun>", "Execute the import on dry run mode")
            .option("-o, --outputToJsonFile", "Output the import result in a JSON file")
            .action(async cmd => {
                await new ActionFlowCommand().importActionFlows(cmd.packageId, cmd.file, cmd.dryRun, cmd.outputToJsonFile);
                process.exit();
            });

        return program;
    }
}

const loadCommands = () => {
    getAllCommands();
};

ContextInitializer.initContext()
    .then(loadCommands, loadCommands)
    .catch(e => {
        logger.error(e);
    });

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}

function getAllCommands(): void {
    Import.packages(program);
    Import.dataPools(program);
    Import.actionFlows(program);

    program.parse(process.argv);
}
