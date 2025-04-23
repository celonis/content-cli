import { logger } from "../util/logger";
import { fileURLToPath } from 'url'; // Needed for ES Modules __dirname equivalent
import path = require("path");
import * as fs from "fs";
import { Command, CommandOptions, ExecutableCommandOptions } from "commander";
import { Context } from "./cli-context";

export interface IModule {
    register(context: Context, commandConfig: Configurator);
}

export interface IModuleConstructor {
    new(): IModule;
}

export class ModuleHandler {

    configurator: Configurator;

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
     */
    discoverAndRegisterModules(rootPath) {
        let modulesDirPath = path.resolve(rootPath, 'modules');
        logger.debug(`Scanning for modules in: ${modulesDirPath}`);

        try {
            const moduleFolders = fs.readdirSync(modulesDirPath, { withFileTypes: true });

            for (const dirent of moduleFolders) {
                if (dirent.isDirectory()) {
                    const moduleFolderName = dirent.name;

                    // Calculate path relative to *this file's location in dist*
                    const potentialModuleJsPath = path.resolve(
                        rootPath, 'modules', moduleFolderName,
                        'module.js' // Look for the compiled JS file
                    );

                    // Check if the compiled JS file exists
                    try {
                        fs.accessSync(potentialModuleJsPath); // Check existence
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
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                logger.error(`Modules directory not found relative to JS output: ${path.resolve(path.dirname(__filename), 'modules')}`);
            } else {
            logger.error('Failed to read modules directory:', error);
            }
        }
        logger.debug(`Module discovery complete. ${this.registeredModules.length} modules registered.`);
    }

}

type CommandHandler =  (context: Context, command: Command) => void; 

/**
 * Allows the creation of root level commands.
 */
export class Configurator {

    rootCommandMap = new Map<string, CommandConfig>();

    constructor(private program: Command, private ctx: Context) {

    }

    /**
     * Get or create a root level command.
     * @param nameAndArgs 
     * @param opts 
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

    command(nameAndArgs: string, opts?: CommandOptions) : CommandConfig {
        return new CommandConfig(this.cmd.command(nameAndArgs, opts), this.ctx);
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
                await handler(ctx, this);
            } catch (error) {
                logger.error(`An unexpected error occured executing a command: ${error}`);
            }
        })
    }

}

