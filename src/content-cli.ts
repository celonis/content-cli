#!/usr/bin/env node

import { logger } from "./util/logger";
import semverSatisfies = require("semver/functions/satisfies");
import { program } from "./util/program";
import {VersionUtils} from "./util/version";

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
program.command("import", "Commands to import content.")

program.command("push", "Commands to push content.");

program.command("update", "Commands to update content.");

program.command("list", "Commands to list content.").alias("ls");

program.command("get", "Commands to get configuration properties.");

program.command("set", "Commands to set configuration properties.");

program.command("config", "Commands related to config management.")

program.command("analyze", "Commands to analyze assets dependencies.");

program.version(VersionUtils.getCurrentCliVersion());
program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}

