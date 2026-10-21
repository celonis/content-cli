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
    }

    private async downloadSdk(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new SdkService(context).downloadSdk(options.appId);
    }
}

export = Module;
