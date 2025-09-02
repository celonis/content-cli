import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { DeploymentService } from "./deployment.service";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        const deploymentCommand = configurator.command("deployment").beta();

        deploymentCommand.command("create")
            .beta()
            .description("Create a new deployment")
            .requiredOption("--packageKey <packageKey>", "Identifier of the package to deploy")
            .requiredOption("--packageVersion <packageVersion>", "Version of the package to deploy")
            .requiredOption("--deployableType <deployableType>", "The type of the deployable")
            .requiredOption("--targetId <targetId>", "Identifier of the target to deploy to")
            .option("--json", "Return the response as a JSON file")
            .action(this.createDeployment);

        const listCommand = deploymentCommand.command("list").beta();

        listCommand.command("history")
            .beta()
            .description("List deployment history")
            .option("--packageKey <packageKey>", "Filter deployment history by package key")
            .option("--targetId <targetId>", "Filter deployment history by target ID")
            .option("--deployableType <deployableType>", "Filter deployment history by deployable type")
            .option("--status <status>", "Filter deployment history by status")
            .option("--createdBy <createdBy>", "Filter deployment history by creator")
            .option("--limit <limit>", "Limit the number of results returned")
            .option("--offset <offset>", "Offset for pagination")
            .option("--json", "Return the response as a JSON file")
            .action(this.listDeploymentHistory);

        listCommand.command("active")
            .beta()
            .description("Get the active deployment(s) for a given target or package.\n"+
                "You can use the command to list the active deployment(s) for a specific target or for a specific package.\n" +
                "The targetIds filter is available only for getting the active deployments for a given package. \n" +
                "Listing active deployments for a package returns paginated results. Use the limit and offset parameters to navigate through the results.")
            .option("--packageKey <packageKey>", "Identifier of the package to get the active deployment for")
            .option("--targetId <targetId>", "Identifier of the target to get the active deployment for")
            .option("--targetIds <targetIds>", "Comma-separated list of target IDs to get the active deployments for (only with packageKey)")
            .option("--limit <limit>", "Limit the number of results returned")
            .option("--offset <offset>", "Offset for pagination")
            .option("--json", "Return the response as a JSON file")
            .action(this.listActiveDeployments);

        listCommand.command("deployables")
            .beta()
            .description("List all deployables")
            .option("--flavor <flavor>", "Filter deployables by flavor")
            .option("--json", "Return the response as a JSON file")
            .action(this.listDeployables);

        listCommand.command("targets")
            .beta()
            .description("List all targets for a given deployable type and package key")
            .requiredOption("--deployableType <deployableType>", "The type of the deployable")
            .option("--packageKey <packageKey>", "Identifier of the package to list targets for")
            .option("--json", "Return the response as a JSON file")
            .action(this.listTargets);
    }

    private async createDeployment(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new DeploymentService(context).createDeployment(options.packageKey, options.packageVersion, options.deployableType, options.targetId, options.json);
    }

    private async listDeploymentHistory(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new DeploymentService(context).getDeployments(
            options.json, options.packageKey, options.targetId, options.deployableType
            , options.status, options.createdBy, options.limit, options.offset);
    }

    private async listActiveDeployments(context: Context, command: Command, options: OptionValues): Promise<void> {
        if (options.packageKey && options.targetId) {
            throw new Error("Please provide either --packageKey or --targetId, not both.");
        }

        if (options.packageKey) {
            const targetIds: string[] = options.targetIds ? options.targetIds.split(",") : [];
            await new DeploymentService(context).getActiveDeploymentsForPackage(options.packageKey, options.json, targetIds, options.limit, options.offset);
        } else if (options.targetId) {
            await new DeploymentService(context).getActiveDeploymentForTarget(options.targetId, options.json);
        } else {
            throw new Error("Either --packageKey or --targetId must be provided.");
        }
    }

    private async listDeployables(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new DeploymentService(context).getDeployables(options.json, options.flavor);
    }

    private async listTargets(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new DeploymentService(context).getTargets(options.json, options.deployableType, options.packageKey);
    }
}

export = Module;