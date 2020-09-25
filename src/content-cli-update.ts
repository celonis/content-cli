import { WorkflowCommand } from "./commands/workflow.command";
import { DataPoolCommand } from "./commands/data-pool.command";

var program = require("commander");

class Update {
    public static workflow(program) {
        program
            .command("workflow")
            .description("Command to update a workflow using a workflow configuration file")
            .option("-p, --profile <profile>", "Profile which you want to use to update the workflow configuration")
            .requiredOption("--id <id>", "Id of the workflow you want to update")
            .requiredOption("-f, --file <file>", "The file you want to push")
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
            .option("-p, --profile <profile>", "Profile which you want to use to update the data pool configuration")
            .requiredOption("--id <id>", "Id of the data pool you want to update")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(async cmd => {
                await new DataPoolCommand().updateDataPool(cmd.profile, cmd.id, cmd.file);
                process.exit();
            });

        return program;
    }
}

Update.workflow(program);
Update.dataPool(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
