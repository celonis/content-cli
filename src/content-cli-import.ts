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
            .option("--spaceMappings <spaceMappings...>", "List of mappings for importing packages to different target spaces. Mappings should follow format 'packageKey:targetSpaceKey'")
            .requiredOption("--packagesFile <packagesFile>", "Exported packages file (relative path)")
            .action(async cmd => {
                await new PackageCommand().batchImportPackages(cmd.spaceMappings, cmd.packagesFile)
                process.exit();
            });

        return program;
    }
}

const options = commander.parseOptions(process.argv)
const indexOfProfileOption = options.unknown.indexOf('-p') !== -1 ? options.unknown.indexOf('-p') : options.unknown.indexOf('--profile');

process.on("unhandledRejection", (e, promise) => {
    logger.error(e.toString());
})

contextService.resolveProfile(options.unknown[indexOfProfileOption + 1]).then(() => {
    getAllCommands();
}, ()=> {
    getAllCommands();
}).catch(e => {
    console.log(e)
});

if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}

function getAllCommands() {
    Import.packages(commander);

    commander.parse(process.argv);
}