import { ContextInitializer } from "./util/context-initializer";
import { logger } from "./util/logger";
import { ActionFlowCommand } from "./commands/action-flow.command";
import commander = require("commander");

type CommanderStatic = commander.CommanderStatic;

class Analyze {
    public static actionFlows(program: CommanderStatic): CommanderStatic {
        program
            .command("action-flows")
            .description("Analyze Action Flows dependencies for a certain package")
            .option("-p, --profile <profile>", "Profile which you want to use to analyze Action Flows")
            .requiredOption("--packageId <packageId>", "ID of the package from which you want to export Action Flows")
            .option("-o, --outputToJsonFile", "Output the analyze result in a JSON file")
            .action(async cmd => {
                await new ActionFlowCommand().analyzeActionFlows(cmd.packageId, cmd.outputToJsonFile);
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
    Analyze.actionFlows(commander);

    commander.parse(process.argv);
}
