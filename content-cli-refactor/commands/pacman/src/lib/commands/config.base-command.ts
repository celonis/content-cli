import { Injectable } from '@nestjs/common';
import {Command, CommandRunner} from "nest-commander";
import {ConfigListCommand} from "./config.commands";

@Injectable()
@Command({
    name: 'config',
    description: 'Configuration Management commands',
    subCommands: [ConfigListCommand],
})
export class MainConfigCommand extends CommandRunner {
    run(passedParams: string[], options?: Record<string, any>): Promise<void> {
        console.log('Hereee!');
        this.command.outputHelp();
        return Promise.resolve();
    }
}