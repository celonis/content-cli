#!/usr/bin/env node
import * as program from "commander";
import { ProfileCommand } from "./commands/profile.command";
import { AnalysisCommand } from "./commands/analysis.command";
import { SkillCommand } from "./commands/skill.command";

const version = require("./package.json").version;

program.version(version);

program
    .command("profiles")
    .description("Command to create a new profile")
    .action(async cmd => {
        await ProfileCommand.listProfiles.call(ProfileCommand);
        process.exit();
    });

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
    .option("--profile <profile>", "Profile which you want to use to pull the analysis")
    .option("--analysisId <analysisId>", "Id of the analysis you want to pull")
    .action(async cmd => {
        await AnalysisCommand.pullAnalysis.call(AnalysisCommand, cmd.profile, cmd.analysisId);
        process.exit();
    });

program
    .command("pull-skill")
    .description("Command to pull a skill using a specific profile")
    .option("--profile <profile>", "Profile which you want to use to pull the analysis")
    .option("--projectId <projectId>", "Id of the project you want to pull")
    .option("--skillId <skillId>", "Id of the skill you want to pull")
    .action(async cmd => {
        await SkillCommand.pullSkill.call(SkillCommand, cmd.profile, cmd.projectId, cmd.skillId);
        process.exit();
    });

program
    .command("push-skill")
    .description("Command to push a skill using a specific profile")
    .option("--profile <profile>", "Profile which you want to use to pull the analysis")
    .option("--projectId <projectId>", "Id of the project you want to push")
    .option("--file <file>", "The file you want to push")
    .action(async cmd => {
        await SkillCommand.pushSkill.call(SkillCommand, cmd.profile, cmd.projectId, cmd.file);
        process.exit();
    });

program.parse(process.argv);
