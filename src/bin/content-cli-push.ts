import { AnalysisCommand } from "../commands/analysis.command";
import { SkillCommand } from "../commands/skill.command";
import { MetadataConfigCommand } from "../commands/metadata-config.command";

var program = require("commander");

class Push {
    public static analysis(program) {
        program
            .command("push")
            .description("Command to push an analysis to a workspace")
            .option("--profile <profile>", "Profile which you want to use to pull the analysis")
            .option("--workspaceId <workspaceId>", "Id of the workspace to which you want to push")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new AnalysisCommand().pushAnalysis(cmd.profile, cmd.workspaceId, cmd.file);
                process.exit();
            });

        return program;
    }

    public static skill(program) {
        program
            .command("skill")
            .description("Command to push a skill using a specific profile")
            .option("--profile <profile>", "Profile which you want to use to pull the analysis")
            .option("--projectId <projectId>", "Id of the project you want to push")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new SkillCommand().pushSkill(cmd.profile, cmd.projectId, cmd.file);
                process.exit();
            });

        return program;
    }

    public static semanticMetadata(program) {
        program
            .command("semantic-metadata")
            .description("Command to push a metadata configuration file using a specific profile")
            .option("--profile <profile>", "Profile which you want to use to pull the objective")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new MetadataConfigCommand().pushMetadataConfig(cmd.profile, cmd.file);
                process.exit();
            });

        return program;
    }
}

Push.analysis(program);
Push.skill(program);
Push.semanticMetadata(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
