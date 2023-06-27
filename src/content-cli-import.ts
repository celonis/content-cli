import {CommanderStatic} from "commander";
import {PackageCommand} from "./commands/package.command";
import {logger} from "./util/logger";
import {contextService} from "./services/context.service";
import * as commander from "commander";

export class Import {

    public static packages(program: CommanderStatic): CommanderStatic {
        program
            .command("packages")
            .description("Command to import all given packages")
            .option("-p, --profile <profile>", "Profile which you want to use to list packages")
            .option("--spaceMapping <spaceMapping...>", "Mapping on which space packages will be created", "[]")
            .option("--exportedDatapoolsFile <exportedDatapoolsFile>", "Exported datapool file (relative path)", "")
            .option("--exportedPackagesFile <exportedPackagesFile>", "Exported packages file (relative path)", "")
            .action(async cmd => {
                await new PackageCommand().batchImportPackages(cmd.spaceMapping, cmd.exportedDatapoolsFile, cmd.exportedPackagesFile)
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
    Import.packages(commander);

    commander.parse(process.argv);
}).catch(e => {
    console.log(e)
});

if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}