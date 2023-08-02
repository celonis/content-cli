import * as commander from "commander";
import { CommanderStatic } from "commander";
import { PackageCommand } from "./commands/package.command";
import { logger } from "./util/logger";
import { DataPoolCommand } from "./commands/data-pool.command";
import { ContextInitializer } from "./util/context-initializer";

export class Export {
    public static packages(program: CommanderStatic): CommanderStatic {
        program
            .command("packages")
            .description("Command to export all given packages")
            .option("-p, --profile <profile>", "Profile which you want to use to list packages")
            .requiredOption("--packageKeys <packageKeys...>", "Exports only given package keys")
            .option("--includeDependencies", "Include variables and dependencies", "")
            .action(async cmd => {
                await new PackageCommand().batchExportPackages(cmd.packageKeys, cmd.includeDependencies)
                process.exit();
            });

        return program;
    }

    public static dataPool(program: CommanderStatic): CommanderStatic {
        program
            .command("data-pool")
            .description("Command to export a data pool")
            .option("-p, --profile <profile>", "Profile which you want to use to pull the data pool")
            .requiredOption("--id <id>", "Id of the data pool you want to pull")
            .option("--outputToJsonFile", "Output the exported data pool to a JSON file")
            .action(async cmd => {
                await new DataPoolCommand().exportDataPool(cmd.id, cmd.outputToJsonFile);
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
    commander.outputHelp();
    process.exit(1);
}

function getAllCommands(): void {
    Export.packages(commander);
    Export.dataPool(commander);

    commander.parse(process.argv);
}