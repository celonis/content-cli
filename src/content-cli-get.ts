import { ConnectionCommand } from "./commands/connection.command";

import { ContextInitializer } from "./util/context-initializer";
import { logger } from "./util/logger";
import { program } from "./util/program";
import { Command } from "commander";

class Get {
    public static connection(program: Command): Command {
        program
            .command("connection")
            .description("Programmatically read properties of your connections")
            .option("-p, --profile <profile>", "Profile which you want to use to update the data pool configuration")
            .requiredOption("--dataPoolId <dataPoolId>", "Id of the data pool you want to update")
            .requiredOption("--connectionId <connectionId>", "Id of the connection you want to update")
            .action(async cmd => {
                await new ConnectionCommand().getProperties(cmd.profile, cmd.dataPoolId, cmd.connectionId);
                process.exit();
            });
        return program;
    }
}

ContextInitializer.initContext()
    .then(() => {
        Get.connection(program);
        program.parse(process.argv);
    })
    .catch(e => {
        logger.error(e);
    });

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
