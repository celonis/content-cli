import { AnalysisCommand } from "./commands/analysis.command";
import { SkillCommand } from "./commands/skill.command";
import { WidgetCommand } from "./commands/widget.command";
import { WorkflowCommand } from "./commands/workflow.command";
import { DataPoolCommand } from "./commands/data-pool.command";
import { AssetCommand } from "./commands/asset.command";
import { PackageCommand } from "./commands/package.command";
import { CTPCommand } from "./commands/ctp.command";

var program = require("commander");

class Push {
    public static analysis(program) {
        program
            .command("analysis")
            .description("Command to push an analysis to a workspace")
            .option("-p, --profile <profile>", "Profile which you want to use to push the analysis")
            .requiredOption("--workspaceId <workspaceId>", "Id of the workspace to which you want to push the analysis")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(async cmd => {
                await new AnalysisCommand().pushAnalysis(cmd.profile, cmd.workspaceId, cmd.file);
                process.exit();
            });

        return program;
    }

    public static ctp(program) {
        program
            .command("ctp")
            .description("Command to push a .ctp (Celonis 4 transport file) to create a package")
            .option("-p, --profile <profile>", "Profile which you want to use to push the analysis")
            .requiredOption("-f, --file <file>", "The .ctp file you want to push")
            .requiredOption("--password <password>", "The password used for extracting the .ctp file")
            .action(async cmd => {
                await new CTPCommand().pushCTPFile(cmd.profile, cmd.file, cmd.password);
                process.exit();
            });

        return program;
    }

    public static skill(program) {
        program
            .command("skill")
            .description("Command to push a skill to a project")
            .option("-p, --profile <profile>", "Profile which you want to use to push the skill")
            .requiredOption("--projectId <projectId>", "Id of the project you want to push")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(async cmd => {
                await new SkillCommand().pushSkill(cmd.profile, cmd.projectId, cmd.file);
                process.exit();
            });

        return program;
    }

    public static widget(program) {
        program
            .command("widget")
            .description("Command to push a widget")
            .option("-p, --profile <profile>", "Profile which you want to use to push the widget")
            .option("--tenantIndependent", "Upload widget tenant independently")
            .option("--userSpecific", "Upload widget only for the user in the provided api token")
            .option("--packageManager", "Upload widget to package manager (deprecated)") // Deprecated
            .action(async cmd => {
                await new WidgetCommand().pushWidget(cmd.profile, !!cmd.tenantIndependent, !!cmd.userSpecific);
                process.exit();
            });

        return program;
    }

    public static workflow(program) {
        program
            .command("workflow")
            .description("Command to push a workflow")
            .option("-p, --profile <profile>", "Profile which you want to use to push the workflow")
            .requiredOption("-f, --file <file>", "The file you want to push")
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
            .option("-p, --profile <profile>", "Profile which you want to use to push the workflows")
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
            .option("-p, --profile <profile>", "Profile which you want to use to push the data pool")
            .requiredOption("-f, --file <file>", "The file you want to push")
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
            .option("-p, --profile <profile>", "Profile which you want to use to push the data pools")
            .action(async cmd => {
                await new DataPoolCommand().pushDataPools(cmd.profile);
                process.exit();
            });

        return program;
    }

    public static asset(program) {
        program
            .command("asset")
            .description("Command to push an asset to Studio")
            .option("-p, --profile <profile>", "Profile which you want to use to push the asset")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .requiredOption("--package <packageKey>", "Key of the package you want to push asset to")
            .action(async cmd => {
                await new AssetCommand().pushAsset(cmd.profile, cmd.file, cmd.package);
                process.exit();
            });

        return program;
    }

    public static assets(program) {
        program
            .command("assets")
            .description("Command to push assets to Studio")
            .option("-p, --profile <profile>", "Profile which you want to use to push the assets")
            .requiredOption("--package <packageKey>", "Key of the package you want to push assets to")
            .action(async cmd => {
                await new AssetCommand().pushAssets(cmd.profile, cmd.package);
                process.exit();
            });

        return program;
    }

    public static package(program) {
        program
            .command("package")
            .description("Command to push a package to Studio")
            .option("-p, --profile <profile>", "Profile which you want to use to push the package")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(async cmd => {
                await new PackageCommand().pushPackage(cmd.profile, cmd.file);
                process.exit();
            });

        return program;
    }

    public static packages(program) {
        program
            .command("packages")
            .description("Command to push packages to Studio")
            .option("-p, --profile <profile>", "Profile which you want to use to push the packages")
            .action(async cmd => {
                await new PackageCommand().pushPackages(cmd.profile);
                process.exit();
            });

        return program;
    }
}

Push.analysis(program);
Push.ctp(program);
Push.skill(program);
Push.widget(program);
Push.workflow(program);
Push.workflows(program);
Push.dataPool(program);
Push.dataPools(program);
Push.asset(program);
Push.assets(program);
Push.package(program);
Push.packages(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
}
