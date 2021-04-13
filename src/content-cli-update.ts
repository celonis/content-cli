import { DataPoolCommand } from "./commands/data-pool.command";

import commander = require("commander");
type CommanderStatic = commander.CommanderStatic;

class Update {
    public static dataPool(program: CommanderStatic): CommanderStatic {
        program
            .command("data-pool")
            .description("Command to update a data pool using a data pool configuration file")
            .option("-p, --profile <profile>", "Profile which you want to use to update the data pool configuration")
            .requiredOption("--id <id>", "Id of the data pool you want to update")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(async cmd => {
                await new DataPoolCommand().updateDataPool(cmd.profile, cmd.id, cmd.file);
                process.exit();
            });

        return program;
    }
}

Update.dataPool(commander);
commander.parse(process.argv);

if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}
