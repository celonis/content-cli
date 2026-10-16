import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { FragmentsService } from "./fragments.service";

class Module extends IModule {
    public register(context: Context, configurator: Configurator): void {
        configurator.command("sdk")
            .description("Publish custom app builds to the Fragment Gateway")
            .command("publish")
            .description("Upload a browser bundle and finalize a release; requires index.html")
            .requiredOption("--app-id <appId>", "Fragment app ID")
            .requiredOption("--dist <distribution>", "Browser-ready build directory containing index.html")
            .action(async (ctx, command, options) => {
                await new FragmentsService(ctx).upload(options.appId, options.dist);
            });
    }
}

export = Module;
