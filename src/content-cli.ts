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

function configureRootCommands(configurator: Configurator): void {
    configurator.command("list")
        .description("Commands to list content.")
        .alias("ls");
}

export interface CreateProgramOptions {
    /**
     * Explicit list of module classes to register. When provided, the factory
     * skips filesystem-based module discovery — useful for tests that want to
     * exercise a single module against the real Commander parser.
     */
    modules?: IModuleConstructor[];
    /**
     * Override the root path used for filesystem-based module discovery.
     * Defaults to the directory of this file (i.e. `dist/` at runtime).
     */
    rootPath?: string;
    /**
     * Force development mode for module discovery (looks up `module.ts`
     * instead of `module.js`). Defaults to `program.opts().dev`.
     */
    devMode?: boolean;
}

/**
 * Build a fully-configured Commander program without parsing argv. The bin
 * entry uses this with auto-discovery; tests pass `{ modules: [...] }` to
 * register only the modules under test and avoid the filesystem walk (which
 * conflicts with the `jest.mock("fs")` setup).
 */
export function createProgram(context: Context, opts: CreateProgramOptions = {}): Command {
    const program = new Command();
    program.configureHelp({
        formatHelp: (cmd, helper) => new ContentCLIHelp().formatHelp(cmd, helper),
        subcommandTerm: cmd => new ContentCLIHelp().subcommandTerm(cmd),
        optionTerm: opt => new ContentCLIHelp().optionTerm(opt),
    });
    program.version(VersionUtils.getCurrentCliVersion());
    program.option("-q, --quietmode", "Reduce output to a minimum", false);
    program.option("-p, --profile [profile]");
    program.option("--gitProfile [gitProfile]", "Git profile to use");
    program.option("--debug", "Print debug messages", false);
    program.option("--dev", "Development Mode", false);

    const moduleHandler = new ModuleHandler(program, context);
    configureRootCommands(moduleHandler.configurator);

    if (opts.modules) {
        for (const moduleClass of opts.modules) {
            const moduleInstance = new moduleClass();
            moduleInstance.register(context, moduleHandler.configurator);
        }
    } else {
        const rootPath = opts.rootPath ?? __dirname;
        const devMode = opts.devMode ?? !!program.opts().dev;
        moduleHandler.discoverAndRegisterModules(rootPath, devMode);
    }

    return program;
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
    bootstrapProgram.option("-q, --quietmode", "Reduce output to a minimum", false);
    bootstrapProgram.option("-p, --profile [profile]");
    bootstrapProgram.option("--gitProfile [gitProfile]", "Git profile to use");
    bootstrapProgram.option("--debug", "Print debug messages", false);
    bootstrapProgram.option("--dev", "Development Mode", false);
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
