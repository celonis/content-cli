import { PackageCommand } from "./commands/package.command";
import { SpaceCommand } from "./commands/space.command";

import commander = require("commander");
type CommanderStatic = commander.CommanderStatic;

class List {
    public static packages(program: CommanderStatic): CommanderStatic {
        program
            .command("packages")
            .description("Command to list all packages")
            .option("-p, --profile <profile>", "Profile which you want to use to list packages")
            .option("--json", "Return response as json type", "")
            .option("--includeDependencies", "Include variables and dependencies", "")
            .action(async cmd => {
                await new PackageCommand().listPackages(cmd.profile, cmd.json, cmd.includeDependencies);
                process.exit();
            });

        return program;
    }

    public static spaces(program: CommanderStatic): CommanderStatic {
        program
            .command("spaces")
            .description("Command to list all spaces")
            .option("-p, --profile <profile>", "Profile which you want to use to list spaces")
            .option("--json", "Return response as json type", "")
            .action(async cmd => {
                await new SpaceCommand().listSpaces(cmd.profile, cmd.json);
                process.exit();
            });

        return program;
    }
}

List.packages(commander);
List.spaces(commander);

commander.parse(process.argv);

if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}
