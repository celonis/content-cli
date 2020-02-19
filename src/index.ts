#!/usr/bin/env node
import * as program from "commander";

const version = require("./package.json").version;

program.version(version);

program.parse(process.argv);
