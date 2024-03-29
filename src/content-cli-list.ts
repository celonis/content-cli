import { PackageCommand } from "./commands/package.command";
import { SpaceCommand } from "./commands/space.command";
import { DataPoolCommand } from "./commands/data-pool.command";
import { AssetCommand } from "./commands/asset.command";
import { logger } from "./util/logger";
import commander = require("commander");
import { ContextInitializer } from "./util/context-initializer";
import { ConnectionCommand } from "./commands/connection.command";
import { VariableCommand } from "./commands/variable.command";

type CommanderStatic = commander.CommanderStatic;

export class List {
    public static packages(program: CommanderStatic): CommanderStatic {
        program
            .command("packages")
            .description("Command to list all packages")
            .option("-p, --profile <profile>", "Profile which you want to use to list packages")
            .option("--json", "Return response as json type", "")
            .option("--includeDependencies", "Include variables and dependencies", "")
            .option("--packageKeys <packageKeys...>", "Lists only given package keys")
            .action(async cmd => {
                await new PackageCommand().listPackages(cmd.json, cmd.includeDependencies, cmd.packageKeys);
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

    public static dataPools(program: CommanderStatic): CommanderStatic {
        program
            .command("data-pools")
            .description("Command to list all Data Pools")
            .option("-p, --profile <profile>", "Profile which you want to use to list data pools")
            .option("--json", "Return response as json type", "")
            .action(async cmd => {
                await new DataPoolCommand().listDataPools(cmd.profile, cmd.json);
                process.exit();
            });

        return program;
    }

    public static connections(program: CommanderStatic):CommanderStatic {
        program
            .command("connection")
            .description("Command to list all connections in a Data Pool")
            .option("-p, --profile <profile>", "Profile which you want to use to list connections")
            .requiredOption("--dataPoolId <dataPoolId>", "ID of the data pool")
            .action(async cmd => {
                await new ConnectionCommand().listConnections(cmd.profile, cmd.dataPoolId);
                process.exit();
            });
        return program;
    }

    public static assets(program: CommanderStatic): CommanderStatic {
        program
            .command("assets")
            .description("Command to list all assets")
            .option("-p, --profile <profile>", "Profile which you want to use to list assets")
            .option("--json", "Return response as json type", "")
            .option("--assetType <assetType>", "type of assets")
            .action(async cmd => {
                await new AssetCommand().listAssets(cmd.profile, cmd.json, cmd.assetType);
                process.exit();
            });

        return program;
    }

    public static assignments(program: CommanderStatic): CommanderStatic {
        program
            .command("assignments")
            .description("Command to list possible variable assignments for a type")
            .option("-p, --profile <profile>", "Profile which you want to use to list possible variable assignments")
            .option("--json", "Return response as json type", "")
            .requiredOption("--type <type>", "Type of variable")
            .option("--params <params>", "Variable query params")
            .action(async cmd => {
                await new VariableCommand().listAssignments(cmd.type, cmd.json, cmd.params);
                process.exit();
            });

        return program;
    }
}

const loadAllCommands = () => {
    List.packages(commander);
    List.spaces(commander);
    List.dataPools(commander);
    List.assets(commander);
    List.connections(commander);
    List.assignments(commander);
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
