#!/usr/bin/env node
const version = require("../package.json").version;

var program = require("commander");

program.command("profile", "Commands related to profiles.");

program.command("pull", "Commands to pull content.");

program.command("push", "Commands to push content.");

program.command("update", "Commands to push content.");

program.version(version);
program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
