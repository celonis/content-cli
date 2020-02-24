#!/usr/bin/env node
const version = require("../package.json").version;

var program = require("commander");

program.command("profile", "Command for profiles").version(version);

program.command("pull", "Command to pull content").version(version);

program.command("push", "Command to push content").version(version);

program.command("update", "Command to push content").version(version);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
