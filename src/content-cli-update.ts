import { MetadataConfigCommand } from "./commands/metadata-config.command";
import { BoardCommand } from "./commands/board.command";
import { WorkflowCommand } from "./commands/workflow.command";
import { DataPoolCommand } from "./commands/data-pool.command";

var program = require("commander");

class Update {
    public static semanticMetadata(program) {
        program
            .command("semantic-metadata")
            .description("Command to pull a metadata configuration file using a specific profile")
            .option("--profile <profile>", "Profile which you want to use to update the metadata")
            .option("--id <id>", "Id of the configuration file you want to update")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new MetadataConfigCommand().updateMetadataConfig(cmd.profile, cmd.id, cmd.file);
                process.exit();
            });

        return program;
    }

    public static board(program) {
        program
            .command("board")
            .description("Command to pull a board configuration file using a specific profile")
            .option("--profile <profile>", "Profile which you want to use to update the board configuration")
            .option("--id <id>", "Id of the configuration file you want to update")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new BoardCommand().updateBoard(cmd.profile, cmd.id, cmd.file);
                process.exit();
            });

        return program;
    }

    public static workflow(program) {
        program
            .command("workflow")
            .description("Command to update a workflow using a workflow configuration file")
            .option("--profile <profile>", "Profile which you want to use to update the workflow configuration")
            .option("--id <id>", "Id of the workflow you want to update")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new WorkflowCommand().updateWorkflow(cmd.profile, cmd.id, cmd.file);
                process.exit();
            });

        return program;
    }

    public static dataPool(program) {
        program
            .command("data-pool")
            .description("Command to update a data pool using a data pool configuration file")
            .option("--profile <profile>", "Profile which you want to use to update the data pool configuration")
            .option("--id <id>", "Id of the data pool you want to update")
            .option("--file <file>", "The file you want to push")
            .action(async cmd => {
                await new DataPoolCommand().updateDataPool(cmd.profile, cmd.id, cmd.file);
                process.exit();
            });

        return program;
    }
}

Update.semanticMetadata(program);
Update.board(program);
Update.workflow(program);
Update.dataPool(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
