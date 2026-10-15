/**
 * Commands for building custom apps with the Celonis SDK.
 */

import { Command, OptionValues } from "commander";
import { Configurator, IModule } from "../../core/command/module-handler";
import { Context } from "../../core/command/cli-context";
import { FatalError } from "../../core/utils/logger";

class Module extends IModule {

    public register(context: Context, configurator: Configurator): void {
        const command = configurator.command("sdk")
                .description("Commands for building custom apps with the Celonis SDK.");

        command.command("token")
                .description("Print an access token for the active profile, refreshing it if needed")
                .option("--json", "Print team url, access token and expiry as JSON")
                .action(this.token);
    }

    private async token(context: Context, command: Command, options: OptionValues): Promise<void> {
        const profile = context.profile;
        if (!profile?.apiToken) {
            throw new FatalError("No access token available. Run 'content-cli profile create' to log in.");
        }
        // Write to stdout directly so the output can be piped or captured by other tools.
        if (options.json) {
            process.stdout.write(JSON.stringify({
                team: profile.team,
                accessToken: profile.apiToken,
                expiresAt: profile.expiresAt,
            }) + "\n");
        } else {
            process.stdout.write(profile.apiToken + "\n");
        }
    }
}

export = Module;
