#!/usr/bin/env node
import * as program from "commander";
import { ProfileCommand } from "./commands/profile.command";
import { AnalysisCommand } from "./commands/analysis.command";
import { SkillCommand } from "./commands/skill.command";
import { ObjectiveCommand } from "./commands/objective.command";
import { MetadataConfigCommand } from "./commands/metadata-config.command";

const version = require("./package.json").version;

program.version(version);

program
    .command("profiles")
    .description("Command to create a new profile")
    .action(async () => {
        await new ProfileCommand().listProfiles();
        process.exit();
    });

program
    .command("create-profile")
    .description("Command to create a new profile")
    .action(async () => {
        await new ProfileCommand().createProfile();
        process.exit();
    });

program
    .command("pull-analysis")
    .description("Command to pull an analysis using a specific profile")
    .option("--profile <profile>", "Profile which you want to use to pull the analysis")
    .option("--analysisId <analysisId>", "Id of the analysis you want to pull")
    .action(async cmd => {
        await new AnalysisCommand().pullAnalysis(cmd.profile, cmd.analysisId);
        process.exit();
    });

program
    .command("pull-skill")
    .description("Command to pull a skill using a specific profile")
    .option("--profile <profile>", "Profile which you want to use to pull the analysis")
    .option("--projectId <projectId>", "Id of the project you want to pull")
    .option("--skillId <skillId>", "Id of the skill you want to pull")
    .action(async cmd => {
        await new SkillCommand().pullSkill(cmd.profile, cmd.projectId, cmd.skillId);
        process.exit();
    });

program
    .command("push-skill")
    .description("Command to push a skill using a specific profile")
    .option("--profile <profile>", "Profile which you want to use to pull the analysis")
    .option("--projectId <projectId>", "Id of the project you want to push")
    .option("--file <file>", "The file you want to push")
    .action(async cmd => {
        await new SkillCommand().pushSkill(cmd.profile, cmd.projectId, cmd.file);
        process.exit();
    });

program
    .command("pull-objective")
    .description("Command to pull an objective using a specific profile")
    .option("--profile <profile>", "Profile which you want to use to pull the objective")
    .option("--objective <objectiveId>", "Id of the objective you want to pull")
    .action(async cmd => {
        await new ObjectiveCommand().pullObjective(cmd.profile, cmd.objective);
        process.exit();
    });

// program
//     .command("push-objective")
//     .description("Command to push an objective using a specific profile")
//     .option("--profile <profile>", "Profile which you want to use to pull the objective")
//     .option("--file <file>", "The file you want to push")
//     .action(async cmd => {
//         await (new ObjectiveCommand).pushObjective(cmd.profile, cmd.file);
//         process.exit();
//     });

program
    .command("pull-semantic-metadata")
    .description("Command to pull a metadata configuration file using a specific profile")
    .option("--profile <profile>", "Profile which you want to use to pull the objective")
    .option("--id <id>", "Id of the configuration file you want to pull")
    .action(async cmd => {
        await new MetadataConfigCommand().pullMetadataConfig(cmd.profile, cmd.id);
        process.exit();
    });

program
    .command("update-semantic-metadata")
    .description("Command to pull a metadata configuration file using a specific profile")
    .option("--profile <profile>", "Profile which you want to use to pull the objective")
    .option("--id <id>", "Id of the configuration file you want to pull")
    .option("--file <file>", "The file you want to push")
    .action(async cmd => {
        await new MetadataConfigCommand().updateMetadataConfig(cmd.profile, cmd.id, cmd.file);
        process.exit();
    });

program
    .command("push-semantic-metadata")
    .description("Command to push a metadata configuration file using a specific profile")
    .option("--profile <profile>", "Profile which you want to use to pull the objective")
    .option("--file <file>", "The file you want to push")
    .action(async cmd => {
        await new MetadataConfigCommand().pushMetadataConfig(cmd.profile, cmd.file);
        process.exit();
    });

program.parse(process.argv);
