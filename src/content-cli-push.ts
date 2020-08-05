import { AnalysisCommand } from "./commands/analysis.command";
import { SkillCommand } from "./commands/skill.command";
import { SemanticModelCommand } from "./commands/semantic-model.command";
import { WidgetCommand } from "./commands/widget.command";
import { BoardCommand } from "./commands/board.command";
import { WorkflowCommand } from "./commands/workflow.command";
import { DataPoolCommand } from "./commands/data-pool.command";

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

    public static semanticModel(program) {
        program
            .command("semantic-model")
            .description("Command to push a semantic model to semantic layer")
            .option("--profile <profile>", "Profile which you want to use to push the semantic model")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new SemanticModelCommand().pushSemanticModel(cmd.profile, cmd.file);
                process.exit();
            });

        return program;
    }

    public static semanticModels(program) {
        program
            .command("semantic-models")
            .description("Command to push semantic models to semantic layer")
            .option("--profile <profile>", "Profile which you want to use to push the semantic models")
            .action(async cmd => {
                await new SemanticModelCommand().pushSemanticModels(cmd.profile);
                process.exit();
            });

        return program;
    }

    public static widget(program) {
        program
            .command("widget")
            .description("Command to push a widget")
            .option("--profile <profile>", "Profile which you want to use to push the widget")
            .option("--tenantIndependent", "Upload widget tenant independently")
            .option("--packageManager", "Upload widget to package manager") // temporary
            .action(async cmd => {
                await new WidgetCommand().pushWidget(cmd.profile, !!cmd.tenantIndependent, !!cmd.packageManager);
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
            .action(async cmd => {
                await new BoardCommand().pushBoards(cmd.profile);
                process.exit();
            });

        return program;
    }

    public static workflow(program) {
        program
            .command("workflow")
            .description("Command to push a workflow")
            .option("--profile <profile>", "Profile which you want to use to push the workflow")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new WorkflowCommand().pushWorkflow(cmd.profile, cmd.file);
                process.exit();
            });

        return program;
    }

    public static workflows(program) {
        program
            .command("workflows")
            .description("Command to push workflows")
            .option("--profile <profile>", "Profile which you want to use to push the workflows")
            .action(async cmd => {
                await new WorkflowCommand().pushWorkflows(cmd.profile);
                process.exit();
            });

        return program;
    }

    public static dataPool(program) {
        program
            .command("data-pool")
            .description("Command to push a data pool")
            .option("--profile <profile>", "Profile which you want to use to push the data pool")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new DataPoolCommand().pushDataPool(cmd.profile, cmd.file);
                process.exit();
            });

        return program;
    }

    public static dataPools(program) {
        program
            .command("data-pools")
            .description("Command to push data pools")
            .option("--profile <profile>", "Profile which you want to use to push the data pools")
            .action(async cmd => {
                await new DataPoolCommand().pushDataPools(cmd.profile);
                process.exit();
            });

        return program;
    }
}

Push.analysis(program);
Push.skill(program);
Push.semanticModel(program);
Push.semanticModels(program);
Push.widget(program);
Push.board(program);
Push.boards(program);
Push.workflow(program);
Push.workflows(program);
Push.dataPool(program);
Push.dataPools(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
