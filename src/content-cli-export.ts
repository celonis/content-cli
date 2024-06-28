import * as commander from "commander";
import { CommanderStatic } from "commander";
import { PackageCommand } from "./commands/package.command";
import { logger } from "./util/logger";
import { DataPoolCommand } from "./commands/data-pool.command";
import { ContextInitializer } from "./util/context-initializer";
import { ActionFlowCommand } from "./commands/action-flow.command";

export class Export {
    public static packages(program: CommanderStatic): CommanderStatic {
        program
            .command("packages")
            .description("Command to export all given packages")
            .option("-p, --profile <profile>", "Profile which you want to use to list packages")
            .requiredOption("--packageKeys <packageKeys...>", "Exports only given package keys")
            .option("--includeDependencies", "Include variables and dependencies", "")
            .option("--excludeActionFlows", "Don't export action flows")
            .action(async cmd => {
                await new PackageCommand().batchExportPackages(cmd.packageKeys, cmd.includeDependencies, cmd.excludeActionFlows ?? false);
                process.exit();
            });

        return program;
    }

    public static dataPool(program: CommanderStatic): CommanderStatic {
        program
            .command("data-pool")
            .description("Command to export a data pool")
            .option("-p, --profile <profile>", "Profile which you want to use to export the data pool")
            .requiredOption("--id <id>", "ID of the data pool you want to export")
            .option("--outputToJsonFile", "Output the exported data pool to a JSON file")
            .action(async cmd => {
                await new DataPoolCommand().exportDataPool(cmd.id, cmd.outputToJsonFile);
                process.exit();
            });

        return program;
    }

    public static actionFlows(program: CommanderStatic): CommanderStatic {
        program
            .command("action-flows")
            .description("Command to export all action-flows in a package with their objects and dependencies")
            .option("-p, --profile <profile>", "Profile which you want to use to export action-flows")
            .requiredOption("-i, --packageId <packageId>", "ID of the package from which you want to export action-flows")
            .option("-f, --file <file>", "Action flows metadata file (relative path)")
            .action(async cmd => {
                await new ActionFlowCommand().exportActionFlows(cmd.packageId, cmd.file);
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
    Export.actionFlows(commander);

    commander.parse(process.argv);
}
