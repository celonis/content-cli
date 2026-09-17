import { Command } from "commander";
import { createProgram, loadProfileOnDemand } from "../../../src/content-cli";
import { Context } from "../../../src/core/command/cli-context";
import { Configurator, IModule, shouldLoadProfile } from "../../../src/core/command/module-handler";

class ProfiledModule extends IModule {
    public register(context: Context, configurator: Configurator): void {
        configurator.command("content")
            .command("show")
            .action(async () => undefined);
    }
}

class ProfileFreeModule extends IModule {
    public register(context: Context, configurator: Configurator): void {
        configurator.command("settings")
            .skipProfileLoading()
            .command("show")
            .action(async () => undefined);
    }
}

describe("shouldLoadProfile", () => {

    it("should load a profile for an unmarked command", () => {
        const command = new Command("export");

        expect(shouldLoadProfile(command)).toBe(true);
    });

    it("should not load a profile for a marked command", () => {
        const command = new Command("profile");
        (command as any).skipsProfileLoading = true;

        expect(shouldLoadProfile(command)).toBe(false);
    });

    it("should inherit the opt-out from an ancestor", () => {
        const parent = new Command("profile");
        (parent as any).skipsProfileLoading = true;
        const child = parent.command("list");

        expect(shouldLoadProfile(child)).toBe(false);
    });
});

describe("loadProfileOnDemand", () => {

    let context: Context;
    let init: jest.SpyInstance;

    beforeEach(() => {
        context = new Context({});
        init = jest.spyOn(context, "init").mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    async function run(modules: any[], args: string[]): Promise<void> {
        const program = createProgram(context, { modules });
        loadProfileOnDemand(program, context);
        program.exitOverride();
        await program.parseAsync(["node", "content-cli", ...args]);
    }

    it("should load the profile for a command that needs one", async () => {
        await run([ProfiledModule], ["content", "show"]);

        expect(init).toHaveBeenCalledTimes(1);
    });

    it("should not load the profile for a command that opted out", async () => {
        await run([ProfileFreeModule], ["settings", "show"]);

        expect(init).not.toHaveBeenCalled();
    });
});
