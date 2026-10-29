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

        sdkCommand
            .command("preview")
            .beta()
            .skipProfileLoading()
            .description("Proxy your local dev server to preview the app inside Celonis")
            .option("--target <target>", "URL of the local dev server to proxy", "http://localhost:4200")
            .option("--port <port>", "Target port on which the preview is hosted", "4300")
            .option("--allow-inline-scripts", "Allow inline scripts in your dev server's HTML")
            .action(this.previewApp);
    }

    private async downloadSdk(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new SdkService(context).downloadSdk(options.appId);
    }

    private async publishApp(context: Context, command: Command, options: OptionValues): Promise<void> {
        await new SdkService(context).publishApp(options.appId, options.dist);
    }

    private async previewApp(context: Context, command: Command, options: OptionValues): Promise<void> {
        const proxy = await new SdkPreviewService().preview(options.target, options.port, options.allowInlineScripts === true);
        await new Promise<void>(resolve => {
            const stop = (): void => {
                process.removeListener("SIGINT", stop);
                process.removeListener("SIGTERM", stop);
                resolve();
            };
            process.once("SIGINT", stop);
            process.once("SIGTERM", stop);
        });
        await proxy.close();
    }
}

export = Module;
