#!/usr/bin/env node
import * as program from "commander";
import { ProfileCommand } from "./commands/profile.command";
import { AnalysisCommand } from "./commands/analysis.command";

const version = require("./package.json").version;

program.version(version);

program
    .command("create-profile")
    .description("Command to create a new profile")
    .action(async cmd => {
        await ProfileCommand.createProfile.call(ProfileCommand);
        process.exit();
    });

program
    .command("pull-analysis")
    .description("Command to pull an analysis using a specific profile")
    .option("-P --profile", "Profile which you want to use to pull the analysis")
    .option("--id", "Id of the analysis you want to pull")
    .action(async (profile, id) => {
        await AnalysisCommand.pullAnalysis.call(AnalysisCommand, profile, id);
        process.exit();
    });

program.parse(process.argv);
