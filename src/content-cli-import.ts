import { CommanderStatic } from "commander";
import { PackageCommand } from "./commands/package.command";
import { logger } from "./util/logger";
import { contextService } from "./services/context.service";
import * as commander from "commander";
import { DataPoolCommand } from "./commands/data-pool.command";
import { ContextInitializer } from "./util/context-initializer";

export class Import {
    public static packages(program: CommanderStatic): CommanderStatic {
        program
            .command("packages")
            .description("Command to import all given packages")
            .option("-p, --profile <profile>", "Profile which you want to use to list packages")
            .option(
                "--spaceMappings <spaceMappings...>",
                "List of mappings for importing packages to different target spaces. Mappings should follow format 'packageKey:targetSpaceKey'"
            )
            .option("--exportedDatapoolsFile <exportedDatapoolsFile>", "Exported datapool file (relative path)", "")
            .requiredOption("--exportedPackagesFile <exportedPackagesFile>", "Exported packages file (relative path)")
            .action(async cmd => {
                await new PackageCommand().batchImportPackages(
                    cmd.spaceMappings,
                    cmd.exportedDatapoolsFile,
                    cmd.exportedPackagesFile
                );
                process.exit();
            });

        return program;
    }

    public static dataPools(program: CommanderStatic): CommanderStatic {
        program
            .command("data-pools")
            .description("Command to batch push multiple data pools with their objects and dependencies")
            .option("-p, --profile <profile>", "Profile which you want to use to push the data pools")
            .requiredOption("-f, --jsonFile <file>", "The file with the JSON data pool batch push request")
            .option("--outputToJsonFile", "Output the batch import result in a json file")
            .action(async cmd => {
                await new DataPoolCommand().batchImportDataPools(cmd.jsonFile, cmd.outputToJsonFile);
                process.exit();
            });

        return program;
    }
}
ContextInitializer.initContext()
    .then(
        () => {
            getAllCommands();
        },
        () => {
            getAllCommands();
        }
    )
    .catch(e => {
        console.error(e);
    });

if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}

function getAllCommands() {
    Import.packages(commander);
    Import.dataPools(commander);

    commander.parse(process.argv);
}
