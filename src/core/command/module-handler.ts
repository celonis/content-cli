import path = require("path");
import * as fs from "fs";
import { Command, CommandOptions, OptionValues } from "commander";
import { Context } from "./cli-context";
import { logger } from "../utils/logger";

export abstract class IModule {
    abstract register(context: Context, commandConfig: Configurator);

    showHelp(context: Context, command: Command) {
        command.outputHelp();
    }
}

export interface IModuleConstructor {
    new(): IModule;
}

export class ModuleHandler {

    public configurator: Configurator;

    constructor(public program: Command, public context: Context) {
        this.configurator = new Configurator(this.program, this.context);
    }

    // Store registered module instances if needed later
    registeredModules: IModule[] = [];

    /**
     * Discovers modules in the specified directory, imports them,
     * instantiates the default exported class, and calls its register method.
     *
     * @param {any} rootPath - __dirname when invoked from the main entry file
     * @param devMode        - Use uncompiled modules for development debug mode
     */
    discoverAndRegisterModules(rootPath, devMode = false) {
        let modulesDirPath = path.resolve(rootPath, "commands");

        try {
            const moduleFolders = fs.readdirSync(modulesDirPath, { withFileTypes: true });

            for (const dirent of moduleFolders) {
                if (dirent.isDirectory()) {
                    const moduleFolderName = dirent.name;

                    const moduleFileName = devMode ? "module.ts" : "module.js";

                    // Calculate path relative to *this file's location in dist*
                    let potentialModuleJsPath;
                    potentialModuleJsPath = path.resolve(
                        rootPath, 'commands', moduleFolderName,
                        moduleFileName // Look for the compiled JS file
                    );
                    try {
                        fs.accessSync(potentialModuleJsPath);
                    } catch (err) {
                        // apparently the file does not exist of is not accessible
                        potentialModuleJsPath = null;
                    }

                    if (!potentialModuleJsPath) {
                        logger.debug(`Module folder ${moduleFolderName} does not contain a valid entry point and is skipped.`);
                    } else {

                        // Check if the compiled JS file exists
                        try {
                            logger.debug(`Found potential module definition: ${potentialModuleJsPath}`);

                            // Dynamically require the module
                            const requiredModule = require(potentialModuleJsPath);

                            // With 'export =' or 'module.exports =', the required value *is* the class
                            const ModuleClass = requiredModule as IModuleConstructor; // Cast for TS check

                            // Basic check: Is it a class (function)?
                            if (typeof ModuleClass === 'function' && ModuleClass.prototype) {
                                const moduleInstance: IModule = new ModuleClass(); // Instantiate

                                // Check if the instance has the register method
                                if (typeof moduleInstance.register === 'function') {
                                    logger.debug(`Registering module: ${moduleFolderName}`);
                                    // Call register - can still be async even if require() is sync
                                    let ctx = this.context;
                                    moduleInstance.register(ctx, this.configurator);
                                    this.registeredModules.push(moduleInstance);
                                } else {
                                    logger.warn(`Module ${moduleFolderName} export does not have a 'register' method.`);
                                }
                            } else {
                                logger.warn(`Module ${moduleFolderName} export is not a class/constructor function.`);
                            }

                        } catch (error: any) {
                            if (error.code === 'ENOENT') {
                                // Compiled module.js not found, maybe folder doesn't contain a valid module
                                logger.warn(`Directory ${moduleFolderName} does not contain a compiled module.js file.`);
                            } else if (error.code === 'MODULE_NOT_FOUND') {
                                logger.debug(`Error details`, error);
                                logger.warn(`Could not require module ${moduleFolderName}. Check dependencies or compilation. Path: ${potentialModuleJsPath}`);
                            }
                            else {
                                logger.error(`Error processing module in ${moduleFolderName}:`, error);
                            }
                        }
                    }
                }
            }
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                logger.error(`Modules directory not found relative to JS output: ${path.resolve(path.dirname(__filename), "commands")}`);
            } else {
            logger.error('Failed to read modules directory:', error);
            }
        }
        logger.debug(`Module discovery complete. ${this.registeredModules.length} modules registered.`);
    }

}

type CommandHandler =  (context: Context, command: Command, options: OptionValues) => void; 

/**
 * Allows the creation of root level commands.
 */
export class Configurator {

    rootCommandMap = new Map<string, CommandConfig>();

    constructor(private program: Command, private ctx: Context) {

    }

    /**
     * Get or create a root level command.
     * @param name
     * @returns 
     */
    command(name: string) : CommandConfig {
        if (this.rootCommandMap.has(name)) {
            return this.rootCommandMap.get(name);
        }
        let cmd = this.program.command(name);
        let cmdConfig = new CommandConfig(cmd, this.ctx);
        this.rootCommandMap.set(name, cmdConfig);
        return cmdConfig;
    }

}

/**
 * Delegate wrapper around the Command object, to simply change the way the program is
 * executed.
 */
export class CommandConfig {
    constructor(private cmd: Command, private ctx: Context) {
    }

    public command(nameAndArgs: string, opts?: CommandOptions): CommandConfig {
        return new CommandConfig(this.cmd.command(nameAndArgs, opts), this.ctx)
            .option("-p, --profile <profile>", "Profile which you want to use");
    }

    alias(alias: string) {
        this.cmd.alias(alias);
        return this;
    }

    description(description: string) {
        this.cmd.description(description);
        return this;
    }

    argument(name: string, description?: string, defaultValue?: unknown): this {
        this.cmd.argument(name, description, defaultValue);
        return this;
    }

    option(flags: string, description?: string, defaultValue?: string | boolean | string[]): this {
        this.cmd.option(flags, description, defaultValue);
        return this;
    }

    requiredOption(flags: string, description?: string, defaultValue?: string | boolean | string[]): this {
        this.cmd.requiredOption(flags, description, defaultValue);
        return this;
    }

    action(handler: CommandHandler) {
        let ctx = this.ctx;
        this.cmd.action(async function () {
            try {
                let cmd = this; // in the context of the execution, this refers to the Command object
                let cmdOptions = cmd.opts();
                await handler(ctx, this, cmdOptions);
            } catch (error) {
                logger.error(`An unexpected error occured executing a command: ${error}`);
            }
        })
    }

}

