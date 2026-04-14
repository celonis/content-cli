import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { ApiService } from "./api.service";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        configurator.command("api")
            .description("Send raw HTTP requests to Celonis APIs on the configured team (beta — testing only).")
            .beta()
            .command("request")
            .description("Send a request to the given Celonis API path (e.g. /package-manager/api/packages)")
            .requiredOption("--path <path>", "API path starting with / (e.g. /package-manager/api/packages)")
            .option("--method <method>", "HTTP method: GET, POST, PUT, DELETE", "GET")
            .option("--body <body>", "Request body as JSON string (for POST/PUT)")
            .option("--json", "Write the response to a JSON file instead of printing it")
            .action(this.request);
    }

    private async request(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new ApiService(context).request(
            options.path,
            (options.method as string).toUpperCase(),
            options.body,
            !!options.json
        );
    }
}

export = Module;
