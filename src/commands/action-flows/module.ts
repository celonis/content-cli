/**
 * Commands related to the Action Flows area.
 */

import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { ActionFlowCommandService } from "./action-flow/action-flow-command.service";
import { SkillCommandService } from "./skill/skill-command.service";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        const analyzeCommand = configurator.command("analyze");
        analyzeCommand.command("action-flows")
            .description("Analyze Action Flows dependencies for a certain package")
            .requiredOption("--packageId <packageId>", "ID of the package from which you want to export Action Flows")
            .option("-o, --outputToJsonFile", "Output the analyze result in a JSON file")
            .action(this.analyzeActionFlows);

        const exportCommand = configurator.command("export");
        exportCommand.command("action-flows")
            .description("Command to export all Action Flows in a package with their objects and dependencies")
            .requiredOption("--packageId <packageId>", "ID of the package from which you want to export Action Flows")
            .option("-f, --file <file>", "Action flows metadata file (relative path)")
            .action(this.exportActionFlows);

        const importCommand = configurator.command("import");
        importCommand.command("action-flows")
            .description("Command to import all Action Flows in a package with their objects and dependencies")
            .requiredOption("--packageId <packageId>", "ID of the package to which you want to export Action Flows")
            .requiredOption("-f, --file <file>", "Exported Action Flows file (relative path)")
            .requiredOption("-d, --dryRun <dryRun>", "Execute the import on dry run mode")
            .option("-o, --outputToJsonFile", "Output the import result in a JSON file")
            .action(this.importActionFlows);

        const pullCommand = configurator.command("pull");
        pullCommand.command("skill")
            .description("Command to pull a skill")
            .requiredOption("--projectId <projectId>", "Id of the project you want to pull")
            .requiredOption("--skillId <skillId>", "Id of the skill you want to pull")
            .action(this.pullSkill);

        const pushCommand = configurator.command("push");
        pushCommand.command("skill")
            .description("Command to push a skill to a project")
            .requiredOption("--projectId <projectId>", "Id of the project you want to push")
            .requiredOption("-f, --file <file>", "The file you want to push")
            .action(this.pushSkill);
    }

    private async analyzeActionFlows(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ActionFlowCommandService(context).analyzeActionFlows(options.packageId, options.outputToJsonFile);
    }

    private async exportActionFlows(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ActionFlowCommandService(context).exportActionFlows(options.packageId, options.file);
    }

    private async importActionFlows(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ActionFlowCommandService(context).importActionFlows(options.packageId, options.file, options.dryRun, options.outputToJsonFile);
    }

    private async pullSkill(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new SkillCommandService(context).pullSkill(options.profile, options.projectId, options.skillId);
    }

    private async pushSkill(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new SkillCommandService(context).pushSkill(options.profile, options.projectId, options.file);
    }
}

export = Module;