import { CommandService } from "../services/command.service";
import { Command } from "commander";

const commandService = new CommandService();

export const program: Command = commandService.program;