/**
 * Configures the module commands, options, etc.
 */

import { Command } from "commander";
import { CommandConfig, Configurator, IModule } from "../../core/module-handler";
import { logger } from "../../util/logger";
import { Context } from "../../core/cli-context";

class TestModule implements IModule {
    register(context: Context, configurator: Configurator) {
        
        let command = configurator.command('test');
        command.option('-k, --key [string]', 'The key');
        command.action(this.invoke);

        // let's add a subcommand
        command.command('blink')
            .description('Blink a few times')
            .option('-c, --count [number]')
            .action(this.blink);


        // lets add 'test' sub-command under the list command
        let listCommand = configurator.command('list');
        listCommand.command('test')
            .description('Test List')
            .option('-c, --count [number]')
            .action(this.testList);


    }

    testList(context: Context, command: Command) {
        
        logger.info(`Test List`);
    }

    blink(context: Context, command: Command) {
        logger.info(`I will blink`);
    }

    invoke(context: Context, command: Command) {
        let options = command.opts();
        logger.info(`Test invocation, key is ${options.key}. Profile is ${context.profileName}`);
        if (context.httpClient) {
            logger.info(`HttpClient is present`);
        }
    }
}

export = TestModule;