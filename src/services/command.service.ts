import { Command } from "commander";

export class CommandService {
    private readonly command: Command;

    constructor() {
        this.command = new Command();
        this.command.parseOptions(process.argv);
    }

    public get program(): Command {
        return this.command;
    }
}