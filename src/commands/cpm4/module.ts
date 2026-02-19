/**
 * Commands related to the CPM4 area.
 */

import {Configurator, IModule} from "../../core/command/module-handler";
import {Context} from "../../core/command/cli-context";
import {Command, OptionValues} from "commander";
import {CTPCommandService} from "./ctp-command.service";

class Module extends IModule {
    public register(context: Context, configurator: Configurator): void {
        const pushCommand = configurator.command("push");
        pushCommand
            .command("ctp")
            .description("Command to push a .ctp (Celonis 4 transport file) to create a package")
            .option("-a, --pushAnalysis", "Specify this option if you want to push analysis from the CTP file")
            .option("-d, --pushDataModels", "Specify this option if you want to push data models from the CTP file")
            .option(
                "--globalPoolName <globalPoolName>",
                "Specify this option if you want to push all Data models into one newly created pool along with value to set the name of the pool to be created",
                null
            )
            .option(
                "--existingPoolId <existingPoolId>",
                "Specify this option if you want to push all Data models into one already existing pool with provided ID",
                null
            )
            .option(
                "-s, --spaceKey <spaceKey>",
                "The key of the destination space where the analyses from .ctp file will be created.",
                ""
            )
            .requiredOption("-f, --file <file>", "The .ctp file you want to push")
            .requiredOption("--password <password>", "The password used for extracting the .ctp file")
            .action(this.pushCTPFile);
    }

    private async pushCTPFile(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new CTPCommandService(context).pushCTPFile(
            options.file,
            options.password,
            options.pushAnalysis,
            options.pushDataModels,
            options.existingPoolId,
            options.globalPoolName,
            options.spaceKey
        );
    }
}

export = Module;
