#!/usr/bin/env node

import semverSatisfies = require("semver/functions/satisfies");
import { Command } from "commander";
import { Configurator, IModuleConstructor, ModuleHandler } from "./core/command/module-handler";
import { Context } from "./core/command/cli-context";
import { VersionUtils } from "./core/utils/version";
import { logger } from "./core/utils/logger";
import { ContentCLIHelp } from "./core/command/CustomHelp";

/**
 * Celonis Content CLI.
 * 
 * This is the main entry point for the CLI.
 */

const requiredVersion = ">=10.10.0";

export interface CreateProgramOptions {
    /**
     * Explicit list of module classes to register. When provided, the factory
     * skips automatic, filesystem-based module discovery.
     */
    modules?: IModuleConstructor[];
    devMode?: boolean;
}

function addDefaultOptions(program: Command): void {
    program.option("-q, --quietmode", "Reduce output to a minimum", false);
    program.option("-p, --profile [profile]");
    program.option("--gitProfile [gitProfile]", "Git profile to use");
    program.option("--debug", "Print debug messages", false);
    program.option("--dev", "Development Mode", false);
}

/**
 * Build a fully-configured Commander program without parsing argv
 */
export function createProgram(context: Context, opts: CreateProgramOptions = {}): Command {
    const program = new Command();
    program.configureHelp({
        formatHelp: (cmd, helper) => new ContentCLIHelp().formatHelp(cmd, helper),
        subcommandTerm: cmd => new ContentCLIHelp().subcommandTerm(cmd),
        optionTerm: opt => new ContentCLIHelp().optionTerm(opt),
    });
    program.version(VersionUtils.getCurrentCliVersion());
    addDefaultOptions(program);

    const moduleHandler = new ModuleHandler(program, context);
    configureRootCommands(moduleHandler.configurator);

    if (opts.modules) {
        for (const moduleClass of opts.modules) {
            const moduleInstance = new moduleClass();
            moduleInstance.register(context, moduleHandler.configurator);
        }
    } else {
        const rootPath = __dirname;
        const devMode = opts.devMode ?? !!program.opts().dev;
        moduleHandler.discoverAndRegisterModules(rootPath, devMode);
    }

    return program;
}

/**
 * To support the legacy command structure, we have to configure some root commands
 * that the individual modules will extend.
 */
function configureRootCommands(configurator: Configurator): void {
    configurator.command("list").description("Commands to list content.").alias("ls");
}

async function run(): Promise<void> {
    if (!semverSatisfies(process.version, requiredVersion)) {
        logger.error(
            `Node version ${process.version} not supported. Please upgrade your node version to ${requiredVersion}`
        );
        process.exit(1);
    }

    // Parse global options up-front so banner/debug-level decisions can use
    // them before module discovery runs.
    const bootstrapProgram = new Command();
    addDefaultOptions(bootstrapProgram);
    bootstrapProgram.allowUnknownOption(true);
    bootstrapProgram.parseOptions(process.argv);
    const globalOpts = bootstrapProgram.opts();

    if (!globalOpts.quietmode) {
        console.log(`Content CLI - (C) Copyright 2025 - Celonis SE - Version ${VersionUtils.getCurrentCliVersion()}`);
        console.log();
    }

    if (globalOpts.debug) {
        logger.transports.forEach(t => {
            t.level = "debug";
        });
    }

    const context = new Context(globalOpts);
    await context.init();

    const program = createProgram(context, { devMode: !!globalOpts.dev });

    try {
        await program.parseAsync(process.argv);
    } catch (error) {
        logger.error(`An unexpected error occurred: ${error}`);
    }
}

if (require.main === module) {
    run();
}

process.on("uncaughtException", (error: Error, origin: NodeJS.UncaughtExceptionOrigin) => {
    console.error("\n💥 UNCAUGHT EXCEPTION!\n");
    console.error("Error:", error);
    console.error("Origin:", origin);
    process.exit(1);
});
