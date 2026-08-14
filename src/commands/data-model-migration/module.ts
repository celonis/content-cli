import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { DataModelMigrationCommands } from "./data-model-migration.commands";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        new DataModelMigrationCommands().register(context, configurator);
    }
}

export = Module;
