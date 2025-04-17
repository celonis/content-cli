/**
 * Configures the module commands, options, etc.
 */

import { Command } from "commander";
import { CommandConfig, IModule } from "../../core/ModuleHandler";
import { logger } from "../../util/logger";
import { Context } from "../../core/Context";

class TestModule implements IModule {
    register(context: Context, command: CommandConfig) {
        
        command.option('-k, --key [string]', 'The key');
        command.action(this.invoke);

        // let's add a subcommand
        command.command('blink')
            .description('Blink a few times')
            .option('-c, --count [number]')
            .action(this.blink);
    }

    blink(context: Context, command: Command) {
        logger.info(`I will blink`);
    }

    invoke(context: Context, command: Command) {
        let options = command.opts();
        logger.info(`invoking me, key is ${options.key}`);
    }
}

export = TestModule;