/**
 * Commands related to the Studio area.
 */

import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";

class Module extends IModule {

    register(context: Context, configurator: Configurator) {
    }

}

export = Module;