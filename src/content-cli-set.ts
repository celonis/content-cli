import { ConnectionCommand } from "./commands/connection.command";
import { ContextInitializer } from "./util/context-initializer";
import { logger } from "./util/logger";
import { Command } from "commander";
import { program } from "./util/program";

class Set {
    public static connection(program: Command): Command {
        program
            .command("connection")
            .description("Programmatically update properties of your connections")
            .option("-p, --profile <profile>", "Profile which you want to use to update the data pool configuration")
            .requiredOption("--dataPoolId <dataPoolId>", "Id of the data pool you want to update")
            .requiredOption("--connectionId <connectionId>", "Id of the connection you want to update")
            .requiredOption("--property <property>", "The property you want to update")
            .requiredOption("--value <value>", "The value you want to update")
            .action(async cmd => {
                await new ConnectionCommand().updateProperty(cmd.profile, cmd.dataPoolId, cmd.connectionId, cmd.property, cmd.value);
                process.exit();
            });

        return program;
    }
}

const loadAllCommands = () => {
    Set.connection(program);
    program.parse(process.argv);
};

ContextInitializer.initContext()
    .then(loadAllCommands, loadAllCommands)
    .catch(e => {
        logger.error(e);
    });

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
