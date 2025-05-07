import {ConfigCommand} from "./commands/config.command";
import { program } from "./util/program";
import {logger} from "./util/logger";
import {ContextInitializer} from "./util/context-initializer";
import { Command } from "commander";

export class Config {
    public static list(program: Command): Command {
        program
            .command("list")
            .description("Command to list active packages that can be exported")
            .option("-p, --profile <profile>", "Profile which you want to use to list possible variable assignments")
            .option("--json", "Return response as json type", "")
            .option("--flavors <flavors...>", "Lists only active packages of the given flavors")
            .option("--withDependencies", "Include dependencies", "")
            .option("--packageKeys <packageKeys...>", "Lists only given package keys")
            .option("--variableValue <variableValue>", "Variable value for filtering packages by.")
            .option("--variableType <variableValue>", "Variable type for filtering packages by.")
            .action(async cmd => {
                await new ConfigCommand().listActivePackages(cmd.json, cmd.flavors, cmd.withDependencies, cmd.packageKeys, cmd.variableValue, cmd.variableType);
                process.exit();
            });

        return program;
    }

    public static listVariables(program: Command): Command {
        program
            .command("variables")
            .description("Commands related to variable configs")
            .command("list")
            .description("Command to list versioned variables of packages")
            .option("-p, --profile <profile>", "Profile which you want to use to list packages")
            .option("--json", "Return response as json type", "")
            .option("--keysByVersion <keysByVersion...>", "Mapping of package keys and versions", "")
            .option("--keysByVersionFile <keysByVersionFile>", "Package keys by version mappings file path.", "")
            .action(async cmd => {
                await new ConfigCommand().listVariables(cmd.json, cmd.keysByVersion, cmd.keysByVersionFile);
                process.exit();
            });

        return program;
    }

    public static export(program: Command): Command {
        program
            .command("export")
            .description("Command to export package configs")
            .option("-p, --profile <profile>", "Profile which you want to use to export packages")
            .requiredOption("--packageKeys <packageKeys...>", "Keys of packages to export")
            .option("--withDependencies", "Include variables and dependencies", "")
            .action(async cmd => {
                await new ConfigCommand().batchExportPackages(cmd.packageKeys, cmd.withDependencies);
                process.exit();
            });

        return program;
    }

    public static import(program: Command): Command {
        program
            .command("import")
            .description("Command to import package configs")
            .option("-p, --profile <profile>", "Profile which you want to use to import packages")
            .option("--overwrite", "Flag to allow overwriting of packages")
            .requiredOption("-f, --file <file>", "Exported packages file (relative path)")
            .action(async cmd => {
                await new ConfigCommand().batchImportPackages(cmd.file, cmd.overwrite);
                process.exit();
            });

        return program;
    }

    public static diff(program: Command): Command {
        program
            .command("diff")
            .description("Command to diff configs of packages")
            .option("-p, --profile <profile>", "Profile of the team/realm which you want to use to diff the packages with")
            .option("--hasChanges", "Flag to return only the information if the package has changes without the actual changes")
            .option("--json", "Return the response as a JSON file")
            .requiredOption("-f, --file <file>", "Exported packages file (relative or absolute path)")
            .action(async cmd => {
                await new ConfigCommand().diffPackages(cmd.file, cmd.hasChanges, cmd.json);
                process.exit();
            });

        return program;
    }
}

const loadAllCommands = () => {
    Config.list(program);
    Config.listVariables(program);
    Config.export(program);
    Config.import(program);
    Config.diff(program)
    program.parse(process.argv);
};

ContextInitializer.initContext()
    .then(loadAllCommands, loadAllCommands)
    .catch(e => {
        logger.error(e);
    });

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
