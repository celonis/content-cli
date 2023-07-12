import {PackageCommand} from "./commands/package.command";
import {SpaceCommand} from "./commands/space.command";
import {DataPoolCommand} from "./commands/data-pool.command";
import {AssetCommand} from "./commands/asset.command";

import commander = require("commander");
import {contextService} from "./services/context.service";
import {logger} from "./util/logger";

type CommanderStatic = commander.CommanderStatic;

export class List {
    public static packages(program: CommanderStatic): CommanderStatic {
        program
            .command("packages")
            .description("Command to list all packages")
            .option("-p, --profile <profile>", "Profile which you want to use to list packages")
            .option("--json", "Return response as json type", "")
            .option("--includeDependencies", "Include variables and dependencies", "")
            .action(async cmd => {
                await new PackageCommand().listPackages(cmd.json, cmd.includeDependencies)
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

function getAllCommands() {
    List.packages(commander);
    List.spaces(commander);
    List.dataPools(commander);
    List.assets(commander);

    commander.parse(process.argv);
}
if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}
