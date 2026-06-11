import { Command, OptionValues } from "commander";
import { runCli } from "../utls/cli-runner";
import { mockAxiosGet, mockAxiosGetError } from "../utls/http-requests-mock";
import {
    ASSET_REGISTRY_DISABLED_ERROR,
    ASSET_REGISTRY_DISABLED_USER_MESSAGE,
} from "../../src/commands/asset-registry/asset-registry-error";
import { AssetRegistryMetadata } from "../../src/commands/asset-registry/asset-registry.interfaces";
import { Configurator, IModule } from "../../src/core/command/module-handler";
import { Context } from "../../src/core/command/cli-context";
import { FatalError, GracefulError } from "../../src/core/utils/logger";

import AssetRegistryModule = require("../../src/commands/asset-registry/module");

const GRACEFUL_MESSAGE = "graceful failure - should not fail the process";

class DiagnosticsModule extends IModule {
    public register(context: Context, configurator: Configurator): void {
        const diag = configurator.command("diag").description("Diagnostics test commands");

        diag.command("graceful")
            .description("Throws a GracefulError")
            .action(async (_ctx: Context, _cmd: Command, _opts: OptionValues): Promise<void> => {
                throw new GracefulError(GRACEFUL_MESSAGE);
            });

        diag.command("fatal")
            .description("Throws a FatalError")
            .action(async (_ctx: Context, _cmd: Command, _opts: OptionValues): Promise<void> => {
                throw new FatalError("boom");
            });
    }
}

describe("CLI process output and exit codes", () => {
    const TYPES_URL = "https://myTeam.celonis.cloud/pacman/api/core/asset-registry/types";

    const metadata: AssetRegistryMetadata = {
        types: {
            BOARD_V2: {
                assetType: "BOARD_V2",
                displayName: "View",
                description: null,
                group: "DASHBOARDS",
                assetSchema: { version: "2.1.0" },
                service: { basePath: "/blueprint/api" },
                endpoints: {
                    schema: "/schema/board_v2",
                    validate: "/validate/board_v2",
                    examples: "/examples/board_v2",
                },
                contributions: { pigEntityTypes: [], dataPipelineEntityTypes: [], actionTypes: [] },
            },
        },
    };

    describe("successful commands", () => {
        it("Should print the version and exit with code 0", async () => {
            const result = await runCli(["-V"], [AssetRegistryModule]);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("test-version");
        });

        it("Should print asset types to stdout and exit with code 0", async () => {
            mockAxiosGet(TYPES_URL, metadata);

            const result = await runCli(["asset-registry", "list"], [AssetRegistryModule]);

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain("BOARD_V2 - View [DASHBOARDS]");
        });
    });

    describe("failing commands produce a non-zero exit code", () => {
        it("Should exit non-zero and report the friendly message when the feature flag is disabled", async () => {
            mockAxiosGetError(TYPES_URL, 403, { error: ASSET_REGISTRY_DISABLED_ERROR });

            const result = await runCli(["asset-registry", "list"], [AssetRegistryModule]);

            expect(result.exitCode).toBe(1);
            expect(result.output).toContain(ASSET_REGISTRY_DISABLED_USER_MESSAGE);
        });

        it("Should exit non-zero for an unknown command", async () => {
            const result = await runCli(["this-command-does-not-exist"], [AssetRegistryModule]);

            expect(result.exitCode).toBe(1);
        });

        it("Should exit non-zero when a required option is missing", async () => {
            const result = await runCli(["asset-registry", "get"], [AssetRegistryModule]);

            expect(result.exitCode).toBe(1);
        });
    });

    describe("action-wrapper error semantics", () => {
        it("Should report a GracefulError without forcing a non-zero exit code", async () => {
            const result = await runCli(["diag", "graceful"], [DiagnosticsModule]);

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain(GRACEFUL_MESSAGE);
        });

        it("Should exit non-zero for a regular error thrown by a command", async () => {
            const result = await runCli(["diag", "fatal"], [DiagnosticsModule]);

            expect(result.exitCode).toBe(1);
        });
    });
});
