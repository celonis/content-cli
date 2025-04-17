//const logProc = require('why-is-node-running')

import semverSatisfies = require("semver/functions/satisfies");
import {VersionUtils} from "./util/version";
import { logger } from "./util/logger";

import { fileURLToPath } from 'url'; // Needed for ES Modules __dirname equivalent
import path = require("path");
import * as fs from "fs";
import { ModuleHandler } from "./core/ModuleHandler";
import { Command } from "commander";
import { Context } from "./core/Context";


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
program.option("-q, --quitemode", "Reduce output to a minimum", false);
program.option("--debug", "Print debug messages", false);
program.parseOptions(process.argv);

/**
 * Celonis Content CLI.
 * 
 * This is the main entry point for the CLI.
 */
if (!program.opts().quitemode) {
    console.log(`Celonis CLI - (C) Copyright 2025 - Celonis SE - Version ${VersionUtils.getCurrentCliVersion()}`);
    console.log();
}

if (program.opts().debug) {
    logger.level = 'debug';
}

let context = new Context();

let moduleHandler = new ModuleHandler(program, context);

moduleHandler.discoverAndRegisterModules(__dirname);


if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}

async function run() {
    await program.parse(process.argv);
    // safe to exit now
    /* -- Uncomment the below to find out why the process does not exit...
    setTimeout(() => {
        console.error("Node is still running. Active Handles:");
        logProc(); // Log details about active handles.
   }, 5000); // Wait 5 seconds before logging, adjust as needed
   */
}
run();