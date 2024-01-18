import {ConfigCommand} from "./commands/config.command";
import commander = require("commander");
import {logger} from "./util/logger";
import {ContextInitializer} from "./util/context-initializer";

type CommanderStatic = commander.CommanderStatic;

export class Config {
    public static list(program: CommanderStatic): CommanderStatic {
        program
            .command("list")
            .description("Command to list active packages that can be exported")
            .option("-p, --profile <profile>", "Profile which you want to use to list possible variable assignments")
            .option("--json", "Return response as json type", "")
            .option("--flavors <flavors...>", "Lists only active packages of the given flavors")
            .option("--withDependencies", "Include dependencies", "")
            .option("--packageKeys <packageKeys...>", "Lists only given package keys")
            .action(async cmd => {
                await new ConfigCommand().listActivePackages(cmd.json, cmd.flavors, cmd.withDependencies, cmd.packageKeys);
                process.exit();
            });

        return program;
    }
}

process.on("unhandledRejection", (e, promise) => {
    logger.error(e.toString());
});

const loadAllCommands = () => {
    Config.list(commander);
    commander.parse(process.argv);
};

ContextInitializer.initContext()
    .then(loadAllCommands)
    .catch(e => {
        logger.error(e);
    });

if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}
