import path = require("path");
import * as fs from "fs";
import { Command, CommandOptions, Option, OptionValues } from "commander";
import { Context } from "./cli-context";
import { logger } from "../utils/logger";
import * as chalk from "chalk";

export abstract class IModule {
    public abstract register(context: Context, commandConfig: Configurator): void;
}

export type IModuleConstructor = new () => IModule;

export class ModuleHandler {
    public configurator: Configurator;

    constructor(
        public program: Command,
        public context: Context
    ) {
        this.configurator = new Configurator(this.program, this.context);
    }

    // Store registered module instances if needed later
    public registeredModules: IModule[] = [];

    /**
     * Discovers modules in the specified directory, imports them,
     * instantiates the default exported class, and calls its register method.
     *
     * @param {any} rootPath - __dirname when invoked from the main entry file
     * @param devMode        - Use uncompiled modules for development debug mode
     */
    public discoverAndRegisterModules(rootPath: string, devMode: boolean = false): void {
        const modulesDirPath = path.resolve(rootPath, "commands");

        try {
            const moduleFolders = fs.readdirSync(modulesDirPath, { withFileTypes: true });

            for (const dirent of moduleFolders) {
                if (dirent.isDirectory()) {
                    const moduleFolderName = dirent.name;

                    const moduleFileName = devMode ? "module.ts" : "module.js";

                    // Calculate path relative to *this file's location in dist*
                    let potentialModuleJsPath: any;
                    potentialModuleJsPath = path.resolve(
                        rootPath,
                        "commands",
                        moduleFolderName,
                        moduleFileName // Look for the compiled JS file
                    );
                    try {
                        fs.accessSync(potentialModuleJsPath);
                    } catch (err) {
                        // apparently the file does not exist of is not accessible
                        potentialModuleJsPath = null;
                    }

                    if (!potentialModuleJsPath) {
                        logger.debug(
                            `Module folder ${moduleFolderName} does not contain a valid entry point and is skipped.`
                        );
                    } else {
                        // Check if the compiled JS file exists
                        try {
                            logger.debug(`Found potential module definition: ${potentialModuleJsPath}`);

                            // Dynamically require the module
                            const requiredModule = require(potentialModuleJsPath);

                            // With 'export =' or 'module.exports =', the required value *is* the class
                            const ModuleClass = requiredModule as IModuleConstructor; // Cast for TS check

                            // Basic check: Is it a class (function)?
                            if (typeof ModuleClass === "function" && ModuleClass.prototype) {
                                const moduleInstance: IModule = new ModuleClass(); // Instantiate

                                // Check if the instance has the register method
                                if (typeof moduleInstance.register === "function") {
                                    logger.debug(`Registering module: ${moduleFolderName}`);
                                    // Call register - can still be async even if require() is sync
                                    moduleInstance.register(this.context, this.configurator);
                                    this.registeredModules.push(moduleInstance);
                                } else {
                                    logger.warn(`Module ${moduleFolderName} export does not have a 'register' method.`);
                                }
                            } else {
                                logger.warn(`Module ${moduleFolderName} export is not a class/constructor function.`);
                            }
                        } catch (error: any) {
                            if (error.code === "ENOENT") {
                                // Compiled module.js not found, maybe folder doesn't contain a valid module
                                logger.warn(
                                    `Directory ${moduleFolderName} does not contain a compiled module.js file.`
                                );
                            } else if (error.code === "MODULE_NOT_FOUND") {
                                logger.debug("Error details", error);
                                logger.warn(
                                    `Could not require module ${moduleFolderName}. Check dependencies or compilation. Path: ${potentialModuleJsPath}`
                                );
                            } else {
                                logger.error(`Error processing module in ${moduleFolderName}:`, error);
                            }
                        }
                    }
                }
            }
        } catch (error: any) {
            if (error.code === "ENOENT") {
                logger.error(
                    `Modules directory not found relative to JS output: ${path.resolve(path.dirname(__filename), "commands")}`
                );
            } else {
                logger.error("Failed to read modules directory:", error);
            }
        }
        logger.debug(`Module discovery complete. ${this.registeredModules.length} modules registered.`);
    }
}

type CommandHandler = (context: Context, command: Command, options: OptionValues) => Promise<void>;

/**
 * Allows the creation of root level commands.
 */
export class Configurator {
    public rootCommandMap = new Map<string, CommandConfig>();

    constructor(
        private program: Command,
        private ctx: Context
    ) {}

    /**
     * Get or create a root level command.
     * @param name
     * @returns
     */
    public command(name: string): CommandConfig {
        if (this.rootCommandMap.has(name)) {
            return this.rootCommandMap.get(name);
        }
        const cmd = this.program.command(name);
        const cmdConfig = new CommandConfig(cmd, this.ctx);
        this.rootCommandMap.set(name, cmdConfig);
        return cmdConfig;
    }
}

/**
 * Delegate wrapper around the Command object, to simply change the way the program is
 * executed.
 */
export class CommandConfig {
    private deprecationMessage: string;
    private isBetaCommand: boolean = false;
    private betaOptions: string[];

    constructor(
        private cmd: Command,
        private ctx: Context
    ) {}

    public command(nameAndArgs: string, opts?: CommandOptions): CommandConfig {
        return new CommandConfig(this.cmd.command(nameAndArgs, opts), this.ctx)
            .option("-p, --profile <profile>", "Profile which you want to use");
    }

    public alias(alias: string): CommandConfig {
        this.cmd.alias(alias);
        return this;
    }

    public description(description: string): CommandConfig {
        this.cmd.description(description);
        return this;
    }

    public argument(name: string, description?: string, defaultValue?: unknown): CommandConfig {
        this.cmd.argument(name, description, defaultValue);
        return this;
    }

    public option(flags: string, description?: string, defaultValue?: string | boolean | string[]): CommandConfig {
        this.cmd.option(flags, description, defaultValue);
        return this;
    }

    public betaOption(flags: string, description?: string, defaultValue?: string | boolean | string[]): CommandConfig {
        const option = new Option(flags, description).default(defaultValue);
        (option as any).isBeta = true;
        this.cmd.addOption(option);
        return this;
    }

    public requiredOption(flags: string, description?: string, defaultValue?: string | boolean | string[]): CommandConfig {
        this.cmd.requiredOption(flags, description, defaultValue);
        return this;
    }

    public deprecationNotice(deprecationMessage: string): CommandConfig {
        this.deprecationMessage = deprecationMessage;
        return this;
    }

    public beta(): CommandConfig {
        this.isBetaCommand = true;
        (this.cmd as any).isBeta = true;
        return this;
    }

    public action(handler: CommandHandler): void {
        this.cmd.action(async (): Promise<void> => {
            try {
                this.printBetaNoticeIfBetaCommand();
                this.printBetaNoticeIfBetaOptions();
                this.printDeprecationNoticeIfDeprecated();
                await handler(this.ctx, this.cmd, this.cmd.opts());
            } catch (error) {
                logger.error(`An unexpected error occured executing a command: ${error}`);
            }
        });
    }

    private printDeprecationNoticeIfDeprecated(): void {
        if (this.deprecationMessage) {
            logger.warn("⚠️  [DEPRECATION NOTICE] \n" + this.deprecationMessage);
        }
    }

    private printBetaNoticeIfBetaCommand(): void {
        if (this.isBetaCommand) {
            logger.info(chalk.yellow("This command is in beta and may change in future releases."));
        }
    }

    private printBetaNoticeIfBetaOptions(): void {
        if (this.isBetaCommand) {
            return;
        }
        for (const option of this.cmd.options) {
            if ((option as any).isBeta) {
                logger.info(chalk.yellow(`The option '${option.long}' is in beta and may change in future releases.`));
            }
        }
    }
}
