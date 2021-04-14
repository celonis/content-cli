import { ProfileCommand } from "./commands/profile.command";

import commander = require("commander");
type CommanderStatic = commander.CommanderStatic;

class Profile {
    public static listProfile(program: CommanderStatic): CommanderStatic {
        program
            .command("list")
            .description("Command to list all stored profiles")
            .action(async () => {
                await new ProfileCommand().listProfiles();
                process.exit();
            });

        return program;
    }

    public static createProfile(program: CommanderStatic): CommanderStatic {
        program
            .command("create")
            .description("Command to create a new profile")
            .option("--setAsDefault", "Set this profile as default")
            .action(async cmd => {
                await new ProfileCommand().createProfile(cmd.setAsDefault);
                process.exit();
            });

        return program;
    }

    public static defaultProfile(program: CommanderStatic): CommanderStatic {
        program
            .command("default <profile>")
            .description("Command to set a profile as default")
            .action(async profile => {
                await new ProfileCommand().makeDefaultProfile(profile);
                process.exit();
            });

        return program;
    }
}

Profile.listProfile(commander);
Profile.createProfile(commander);
Profile.defaultProfile(commander);

commander.parse(process.argv);

if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}
