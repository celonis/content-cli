#!/usr/bin/env node

import semverSatisfies = require("semver/functions/satisfies");
import { Command } from "commander";
import { Configurator, ModuleHandler } from "./core/command/module-handler";
import { Context } from "./core/command/cli-context";
import { VersionUtils } from "./core/utils/version";
import { logger } from "./core/utils/logger";
import { ContentCLIHelp } from "./core/command/CustomHelp";

/**
 * Celonis Content CLI.
 * 
 * This is the main entry point for the CLI.
 */

// Check if the Node.js version satisfies the minimum requirements
const requiredVersion = ">=10.10.0";
if (!semverSatisfies(process.version, requiredVersion)) {
    logger.error(
        `Node version ${process.version} not supported. Please upgrade your node version to ${requiredVersion}`
    );
    process.exit(1);
}

// Global configuration options
const program: Command = new Command();
program.configureHelp({
    formatHelp: (cmd, helper) => new ContentCLIHelp().formatHelp(cmd, helper),
    subcommandTerm:cmd => new ContentCLIHelp().subcommandTerm(cmd),
    optionTerm: opt => new ContentCLIHelp().optionTerm(opt),
});
program.version(VersionUtils.getCurrentCliVersion());
program.option("-q, --quietmode", "Reduce output to a minimum", false);
program.option("-p, --profile [profile]");
program.option("--debug", "Print debug messages", false);
program.option("--dev", "Development Mode", false);
program.parseOptions(process.argv);

if (!program.opts().quietmode) {
    console.log(`Content CLI - (C) Copyright 2025 - Celonis SE - Version ${VersionUtils.getCurrentCliVersion()}`);
    console.log();
}

if (program.opts().debug) {
    logger.transports.forEach(t => {
        t.level = "debug";
    });
}

/** 
 * To support the legacy command structure, we have to configure some root commands
 * that the individual modules will extend.
 */ 
function configureRootCommands(configurator: Configurator): void {
    configurator.command("list")
        .description("Commands to list content.")
        .alias("ls");
}

async function run(): Promise<void> {
    const context = new Context(program.opts());
    await context.init();

    const moduleHandler = new ModuleHandler(program, context);
    
    configureRootCommands(moduleHandler.configurator);

    moduleHandler.discoverAndRegisterModules(__dirname, program.opts().dev);
    
    try {
        program.parse(process.argv);
    } catch (error) {
        logger.error(`An unexpected error occurred: ${error}`);
    }
}

run();

// catch uncaught exceptions
process.on("uncaughtException", (error: Error, origin: NodeJS.UncaughtExceptionOrigin) => {
    console.error("\n💥 UNCAUGHT EXCEPTION!\n");
    console.error("Error:", error);
    console.error("Origin:", origin);
    process.exit(1);
});