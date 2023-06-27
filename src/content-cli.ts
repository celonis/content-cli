#!/usr/bin/env node

import { logger } from "./util/logger";
import semverSatisfies = require("semver/functions/satisfies");
import program = require("commander");
// tslint:disable-next-line:no-var-requires
const { version } = require("./package.json");

const requiredVersion = ">=10.10.0";
if (!semverSatisfies(process.version, requiredVersion)) {
    logger.error(
        `Node version ${process.version} not supported. Please upgrade your node version to ${requiredVersion}`
    );
    process.exit(1);
}

program.command("profile", "Commands related to profiles.");

program.command("pull", "Commands to pull content.");

program.command("export", "Commands to export content.")
program.command("import", "Commands to export content.")

program.command("push", "Commands to push content.");

program.command("update", "Commands to update content.");

program.command("list", "Commands to list content.").alias("ls");

program.version(version);
program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}

