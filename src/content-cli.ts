#!/usr/bin/env node

import semverSatisfies = require("semver/functions/satisfies");
import { Command } from "commander";
import { Configurator, ModuleHandler } from "./core/command/module-handler";
import { Context } from "./core/command/cli-context";
import { VersionUtils } from "./core/utils/version";
import { logger } from "./core/utils/logger";

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

async function configureGlobalConfigurationOptions(): Promise<Command> {
    const program: Command = new Command();
    const currentCliVersion = await VersionUtils.getCurrentCliVersion();
    program.version(currentCliVersion);
    program.option("-q, --quietmode", "Reduce output to a minimum", false);
    program.option("-p, --profile [profile]");
    program.option("--debug", "Print debug messages", false);
    program.option("--dev", "Development Mode", false);
    program.parseOptions(process.argv);

    if (!program.opts().quietmode) {
        console.log(`Content CLI - (C) Copyright 2025 - Celonis SE - Version ${currentCliVersion}`);
        console.log();
    }

    if (program.opts().debug) {
        logger.transports.forEach(t => {
            t.level = "debug";
        });
    }
    return program;
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
    const program = await configureGlobalConfigurationOptions();
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