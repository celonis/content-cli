import {ConfigCommand} from "./commands/config.command";
import commander = require("commander");
import {logger} from "./util/logger";
import {ContextInitializer} from "./util/context-initializer";

type CommanderStatic = commander.CommanderStatic;

export class Config {
    public static list(program: CommanderStatic): CommanderStatic {
        program
            .command("list")
            .description("Command to list active packages that can be exported")
            .option("-p, --profile <profile>", "Profile which you want to use to list possible variable assignments")
            .option("--json", "Return response as json type", "")
            .option("--flavors <flavors...>", "Lists only active packages of the given flavors")
            .option("--withDependencies", "Include dependencies", "")
            .option("--packageKeys <packageKeys...>", "Lists only given package keys")
            .action(async cmd => {
                await new ConfigCommand().listActivePackages(cmd.json, cmd.flavors, cmd.withDependencies, cmd.packageKeys);
                process.exit();
            });

        return program;
    }

    public static listVariables(program: CommanderStatic): CommanderStatic {
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

    public static export(program: CommanderStatic): CommanderStatic {
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

    public static import(program: CommanderStatic): CommanderStatic {
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

    public static diff(program: CommanderStatic): CommanderStatic {
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
    Config.list(commander);
    Config.listVariables(commander);
    Config.export(commander);
    Config.import(commander);
    Config.diff(commander)
    commander.parse(process.argv);
};

ContextInitializer.initContext()
    .then(loadAllCommands, loadAllCommands)
    .catch(e => {
        logger.error(e);
    });

if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}
