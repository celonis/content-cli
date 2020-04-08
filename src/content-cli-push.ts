import { AnalysisCommand } from "./commands/analysis.command";
import { SkillCommand } from "./commands/skill.command";
import { MetadataConfigCommand } from "./commands/metadata-config.command";
import { WidgetCommand } from "./commands/widget.command";
import { BoardCommand } from "./commands/board.command";

var program = require("commander");

class Push {
    public static analysis(program) {
        program
            .command("analysis")
            .description("Command to push an analysis to a workspace")
            .option("--profile <profile>", "Profile which you want to use to push the analysis")
            .option("--workspaceId <workspaceId>", "Id of the workspace to which you want to push the analysis")
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
            .description("Command to push a skill to a project")
            .option("--profile <profile>", "Profile which you want to use to push the skill")
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
            .description("Command to push a metadata configuration to semantic layer")
            .option("--profile <profile>", "Profile which you want to use to push the metadata")
            .option("--team <team>", "URL for of team")
            .option("--apiKey <apiKey>", "Api key of your team")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new MetadataConfigCommand().pushMetadataConfig(cmd.profile, cmd.file);
                process.exit();
            });

        return program;
    }

    public static semanticMetadatas(program) {
        program
            .command("semantic-metadatas")
            .description("Command to push semantic models to semantic layer")
            .option("--profile <profile>", "Profile which you want to use to push the metadata")
            .option("--team <team>", "URL for of team")
            .option("--apiKey <apiKey>", "Api key of your team")
            .action(async cmd => {
                await new MetadataConfigCommand().pushMetadataConfigs(cmd.profile, cmd.team, cmd.apiKey);
                process.exit();
            });

        return program;
    }

    public static widget(program) {
        program
            .command("widget")
            .description("Command to push a widget")
            .option("--profile <profile>", "Profile which you want to use to push the widget")
            .option("--team <team>", "URL for of team")
            .option("--apiKey <apiKey>", "Api key of your team")
            .action(async cmd => {
                await new WidgetCommand().pushWidget(cmd.profile, cmd.team, cmd.apiKey);
                process.exit();
            });

        return program;
    }

    public static board(program) {
        program
            .command("board")
            .description("Command to push a board")
            .option("--profile <profile>", "Profile which you want to use to push the board")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new BoardCommand().pushBoard(cmd.profile, cmd.file);
                process.exit();
            });

        return program;
    }

    public static boards(program) {
        program
            .command("boards")
            .description("Command to push boards")
            .option("--profile <profile>", "Profile which you want to use to push the board")
            .option("--team <team>", "URL for of team")
            .option("--apiKey <apiKey>", "Api key of your team")
            .action(async cmd => {
                await new BoardCommand().pushBoards(cmd.profile, cmd.team, cmd.apiKey);
                process.exit();
            });

        return program;
    }
}

Push.analysis(program);
Push.skill(program);
Push.semanticMetadata(program);
Push.semanticMetadatas(program);
Push.widget(program);
Push.board(program);
Push.boards(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
