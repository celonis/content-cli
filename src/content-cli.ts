#!/usr/bin/env node

import { logger } from "./util/logger";
const version = require("./package.json").version;
const semverSatisfies = require("semver/functions/satisfies");
import * as program from "commander";

const requiredVersion = ">=10.10.0";
if (!semverSatisfies(process.version, requiredVersion)) {
    logger.error(
        `Node version ${process.version} not supported. Please upgrade your node version to ${requiredVersion}`
    );
    process.exit(1);
}

program.command("profile", "Commands related to profiles.");

program.command("pull", "Commands to pull content.");

program.command("push", "Commands to push content.");

program.command("update", "Commands to update content.");

program.version(version);
program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
