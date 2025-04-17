import { ProfileCommand } from "./modules/profile/profile.command";
import { Command } from "commander";
import { program } from "./util/program";

class Profile {
    public static listProfile(program: Command): Command {
        program
            .command("list")
            .description("Command to list all stored profiles")
            .action(async () => {
                await new ProfileCommand().listProfiles();
                process.exit();
            });

        return program;
    }

    public static createProfile(program: Command): Command {
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

    public static defaultProfile(program: Command): Command {
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

Profile.listProfile(program);
Profile.createProfile(program);
Profile.defaultProfile(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
