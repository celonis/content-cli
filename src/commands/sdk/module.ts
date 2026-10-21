import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { Command, OptionValues } from "commander";
import { SdkService } from "./sdk.service";

class Module extends IModule {
    public register(context: Context, configurator: Configurator): void {
        const sdkCommand = configurator
            .command("sdk")
            .beta()
            .description("Implement custom apps for Codespace assets using the Celonis SDK");

        sdkCommand
            .command("download")
            .beta()
            .description("Download the latest Celonis SDK generated for a Codespace asset")
            .requiredOption("--appId <appId>", "Identifier of the app to download the SDK for")
            .action(this.downloadSdk);

        sdkCommand
            .command("publish")
            .beta()
            .description("Publish a build of a custom app as a new version of its Codespace asset")
            .requiredOption("--appId <appId>", "Identifier of the app to publish the build for")
            .requiredOption("--dist <dist>", "Directory containing the build of the app")
            .action(this.publishApp);
    }

    private async downloadSdk(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new SdkService(context).downloadSdk(options.appId);
    }

    private async publishApp(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new SdkService(context).publishApp(options.appId, options.dist);
    }
}

export = Module;
