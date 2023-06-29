import {CommanderStatic} from "commander";
import {PackageCommand} from "./commands/package.command";
import {logger} from "./util/logger";
import {contextService} from "./services/context.service";
import {List} from "./content-cli-list";
import * as commander from "commander";

export class Export {

    public static packages(program: CommanderStatic): CommanderStatic {
        program
            .command("packages")
            .description("Command to export all given packages")
            .option("-p, --profile <profile>", "Profile which you want to use to list packages")
            .requiredOption("--packageKeys <packageKeys...>", "Exports only given package keys")
            .option("--includeDependencies", "Include variables and dependencies", "")
            .action(async cmd => {
                await new PackageCommand().batchExportPackages(cmd.packageKeys, cmd.includeDependencies, cmd.profile)
                process.exit();
            });

        return program;
    }
}

const options = commander.parseOptions(process.argv)
const indexOfProfileOption = options.unknown.indexOf('-p') ?? options.unknown.indexOf('--profile');

process.on("unhandledRejection", (e, promise) => {
    logger.error(e.toString());
})

contextService.resolveProfile(options.unknown[indexOfProfileOption + 1]).then(() => {
    Export.packages(commander);

    commander.parse(process.argv);
}).catch(e => {
    console.log(e)
});

if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}