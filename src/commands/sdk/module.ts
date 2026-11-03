import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { SdkPreviewService } from "./sdk-preview.service";
import { SdkService } from "./sdk.service";

class Module extends IModule {
    public register(context: Context, configurator: Configurator): void {
        const sdkCommand = configurator
            .command("sdk")
            .beta()
            .description("Implement custom apps for Codespace assets using the Celonis SDK");

        sdkCommand
            .command("publish")
            .beta()
            .description("Publish a build of a custom app as a new version of its Codespace asset")
            .requiredOption("--appId <appId>", "Identifier of the app to publish the build for")
            .requiredOption("--dist <dist>", "Directory containing the build of the app")
            .option("--buildVersion <buildVersion>", "Semantic version of the build. Defaults to the next major version")
            .option("--message <message>", "Message describing the build, at most 500 characters")
            .action(this.publishApp);

        sdkCommand
            .command("preview")
            .beta()
            .skipProfileLoading()
            .description("Proxy your local dev server to preview the app inside Celonis")
            .option("--target <target>", "URL of the local dev server to proxy", "http://localhost:4200")
            .option("--port <port>", "Target port on which the preview is hosted", "4300")
            .option("--allow-inline-scripts", "Allow inline scripts in your dev server's HTML")
            .action(this.previewApp);

        sdkCommand
            .command("token")
            .beta()
            .description("Print a token with read access to the Celonis SDK, e.g. to authenticate against the npm registry")
            .action(this.printToken);
    }

    private async publishApp(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new SdkService(context).publishApp(options.appId, options.dist, options.buildVersion, options.message);
    }

    private async previewApp(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new SdkPreviewService().previewUntilStopped(options.target, options.port, options.allowInlineScripts === true);
    }

    private async printToken(context: Context): Promise<void> {
        await new SdkService(context).printToken();
    }
}

export = Module;
