import { Command, Help } from "commander";
import * as chalk from "chalk";

export class ContentCLIHelp extends Help {
  public subcommandTerm(cmd: Command): string {
    const base = super.subcommandTerm(cmd);
    return (cmd as any).isBeta === true
      ? `${base} ${chalk.yellow("(beta)")}`
      : base;
  }

  public optionTerm(option: any): string {
    const term = super.optionTerm(option);
    return (option as any).isBeta === true
      ? `${term} ${chalk.yellow("(beta)")}`
      : term;
  }
}
