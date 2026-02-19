/**
 * Commands related to the Data Pipeline area.
 */

import {Configurator, IModule} from "../../core/command/module-handler";
import {Context} from "../../core/command/cli-context";
import {ConnectionCommands} from "./connection/connection.commands";
import {DataPoolCommands} from "./data-pool/data-pool.commands";

class Module extends IModule {
    public register(context: Context, configurator: Configurator): void {
        new DataPoolCommands().register(context, configurator);
        new ConnectionCommands().register(context, configurator);
    }
}

export = Module;
