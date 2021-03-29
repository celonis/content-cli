import { PackageCommand } from "./commands/package.command";

import commander = require("commander");
type CommanderStatic = commander.CommanderStatic;

class List {
    public static packages(program: CommanderStatic) {
        program
            .command("packages")
            .description("Command to list all packages")
            .action(async cmd => {
                await new PackageCommand().listPackages(cmd.profile);
                process.exit();
            });

        return program;
    }
}

List.packages(commander);

commander.parse(process.argv);

if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}
