//const logProc = require('why-is-node-running')

import semverSatisfies = require("semver/functions/satisfies");
import { VersionUtils } from "./util/version";
import { logger } from "./util/logger";
import { ModuleHandler } from "./core/module-handler";
import { Command } from "commander";
import { Context } from "./core/cli-context";


// Check if the Node.js version satisfies the minimum requirements
const requiredVersion = ">=10.10.0";
if (!semverSatisfies(process.version, requiredVersion)) {
    logger.error(
        `Node version ${process.version} not supported. Please upgrade your node version to ${requiredVersion}`
    );
    process.exit(1);
}

const program: Command = new Command();
program.version(VersionUtils.getCurrentCliVersion());
program.option("-q, --quietmode", "Reduce output to a minimum", false);
program.option("-p, --profile [profile]");
program.option("--debug", "Print debug messages", false);
program.parseOptions(process.argv);

/**
 * Celonis Content CLI.
 * 
 * This is the main entry point for the CLI.
 */
if (!program.opts().quietmode) {
    console.log(`Celonis CLI - (C) Copyright 2025 - Celonis SE - Version ${VersionUtils.getCurrentCliVersion()}`);
    console.log();
}

if (program.opts().debug) {
    logger.transports.forEach(t => {
        t.level = 'debug';
    });
}

async function run() {

    let context = new Context(program.opts());
    await context.init();

    let moduleHandler = new ModuleHandler(program, context);
    
    moduleHandler.discoverAndRegisterModules(__dirname);
    
    if (!process.argv.slice(2).length) {
        program.outputHelp();
    }
    
    try {
        program.parse(process.argv);
    } catch (error) {
        logger.error(`An unexpected error occured: ${error}`);
    }

    /* -- Uncomment the below to find out why the process does not exit...
    setTimeout(() => {
        console.error("Node is still running. Active Handles:");
        logProc(); // Log details about active handles.
   }, 5000); // Wait 5 seconds before logging, adjust as needed
   */
}
run();

// catch uncaught exceptions
process.on('uncaughtException', (error: Error, origin: NodeJS.UncaughtExceptionOrigin) => {
    console.error(`\n💥 UNCAUGHT EXCEPTION!\n`);
    console.error('Error:', error);
    console.error('Origin:', origin);
    process.exit(1);
});