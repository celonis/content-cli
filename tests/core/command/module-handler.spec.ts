import { Command } from "commander";
import { Configurator } from "../../../src/core/command/module-handler";
import { GracefulError } from "../../../src/core/utils/logger";
import { loggingTestTransport } from "../../jest.setup";
import { testContext } from "../../utls/test-context";

describe("CommandConfig action error handling", () => {
    let previousExitCode: number | undefined;

    beforeEach(() => {
        previousExitCode = process.exitCode;
        process.exitCode = 0;
        loggingTestTransport.logMessages = [];
    });

    afterEach(() => {
        process.exitCode = previousExitCode;
    });

    async function runCommand(handler: () => Promise<void>): Promise<void> {
        const program = new Command();
        const configurator = new Configurator(program, testContext);

        configurator.command("test-command").action(async () => {
            await handler();
        });

        program.exitOverride();
        await program.parseAsync(["node", "content-cli", "test-command"]);
    }

    it("logs a graceful error and keeps exitCode at zero", async () => {
        await runCommand(async () => {
            throw new GracefulError("graceful failure");
        });

        expect(process.exitCode ?? 0).toBe(0);
        expect(
            loggingTestTransport.logMessages.some(entry =>
                String(entry.message).includes("graceful failure")
            )
        ).toBe(true);
        expect(
            loggingTestTransport.logMessages.some(entry =>
                String(entry.message).includes("An unexpected error occured executing a command")
            )
        ).toBe(false);
    });

    it("logs unexpected errors and marks the process as failed", async () => {
        await runCommand(async () => {
            throw new Error("boom");
        });

        expect(process.exitCode).toBe(1);
        expect(
            loggingTestTransport.logMessages.some(entry =>
                String(entry.message).includes("An unexpected error occured executing a command")
            )
        ).toBe(true);
    });

    it("translates a backend feature-disabled error into a clear message (exit 0)", async () => {
        await runCommand(async () => {
            throw new Error('{"errorCode":"feature-disabled","feature":"pacman.branching"}');
        });

        expect(process.exitCode ?? 0).toBe(0);
        expect(
            loggingTestTransport.logMessages.some(entry =>
                String(entry.message).includes("is not enabled for your team")
            )
        ).toBe(true);
        expect(
            loggingTestTransport.logMessages.some(entry =>
                String(entry.message).includes("An unexpected error occured executing a command")
            )
        ).toBe(false);
    });
});

describe("CommandConfig beta notices", () => {
    beforeEach(() => {
        loggingTestTransport.logMessages = [];
    });

    async function runBetaCommand(): Promise<void> {
        const program = new Command();
        const configurator = new Configurator(program, testContext);

        configurator.command("test-command").beta().action(async () => undefined);

        program.exitOverride();
        await program.parseAsync(["node", "content-cli", "test-command"]);
    }

    async function runCommandWithBetaOption(): Promise<void> {
        const program = new Command();
        const configurator = new Configurator(program, testContext);

        configurator
            .command("test-command")
            .betaOption("--preview", "Beta option")
            .action(async () => undefined);

        program.exitOverride();
        await program.parseAsync(["node", "content-cli", "test-command", "--preview"]);
    }

    function findLogEntry(text: string) {
        return loggingTestTransport.logMessages.find(entry => String(entry.message).includes(text));
    }

    it("warns that a beta command may change, so the notice goes to stderr", async () => {
        await runBetaCommand();

        expect(findLogEntry("This command is in beta")?.level).toContain("warn");
    });

    it("warns that a provided beta option may change, so the notice goes to stderr", async () => {
        await runCommandWithBetaOption();

        expect(findLogEntry("The option '--preview' is in beta")?.level).toContain("warn");
    });
});
