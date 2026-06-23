import { runCli } from "../utls/cli-runner";
import { mockAxiosGet, mockAxiosGetError } from "../utls/http-requests-mock";
import {
    ASSET_REGISTRY_DISABLED_ERROR,
    ASSET_REGISTRY_DISABLED_USER_MESSAGE,
} from "../../src/commands/asset-registry/asset-registry-error";
import {
    AgentSkillsResponse,
    AssetRegistryDescriptor,
    AssetRegistryMetadata,
} from "../../src/commands/asset-registry/asset-registry.interfaces";
import { FatalError } from "../../src/core/utils/logger";
import { VersionUtils } from "../../src/core/utils/version";

import AssetRegistryModule = require("../../src/commands/asset-registry/module");

describe("CLI process output and exit codes", () => {
    const BASE_URL = "https://myTeam.celonis.cloud";
    const TYPES_URL = `${BASE_URL}/pacman/api/core/asset-registry/types`;
    const SKILLS_URL = `${BASE_URL}/pacman/api/core/asset-registry/skills`;
    const TYPE_URL = `${BASE_URL}/pacman/api/core/asset-registry/types/BOARD_V2`;
    const SCHEMA_URL = `${BASE_URL}/pacman/api/core/asset-registry/schemas/BOARD_V2`;
    const EXAMPLES_URL = `${BASE_URL}/pacman/api/core/asset-registry/examples/BOARD_V2`;

    const descriptor: AssetRegistryDescriptor = {
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
    };

    const metadata: AssetRegistryMetadata = { types: { BOARD_V2: descriptor } };

    const skills: AgentSkillsResponse = {
        skills: [
            {
                name: "board-create",
                description: "Create a new View asset",
                path: "/blueprint/api/skills/board-create",
                metadata: { version: "1.0.0" },
            },
        ],
    };

    describe("successful commands", () => {
        it("Should print the CLI version and exit with code 0", async () => {
            const result = await runCli(["-V"], [AssetRegistryModule]);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain(VersionUtils.getCurrentCliVersion());
        });

        it("asset-registry list: prints types to output and exits 0", async () => {
            mockAxiosGet(TYPES_URL, metadata);

            const result = await runCli(["asset-registry", "list"], [AssetRegistryModule]);

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain("BOARD_V2 - View [DASHBOARDS]");
        });

        it("asset-registry get: prints full descriptor and exits 0", async () => {
            mockAxiosGet(TYPE_URL, descriptor);

            const result = await runCli(
                ["asset-registry", "get", "--assetType", "BOARD_V2"],
                [AssetRegistryModule]
            );

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain("Asset Type:   BOARD_V2");
            expect(result.output).toContain("Display Name: View");
            expect(result.output).toContain("Group:        DASHBOARDS");
        });

        it("asset-registry schema: prints schema JSON and exits 0", async () => {
            const schema = { $schema: "http://json-schema.org/draft-07/schema#", type: "object" };
            mockAxiosGet(SCHEMA_URL, schema);

            const result = await runCli(
                ["asset-registry", "schema", "--assetType", "BOARD_V2"],
                [AssetRegistryModule]
            );

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain("json-schema.org");
        });

        it("asset-registry examples: prints example JSON and exits 0", async () => {
            const example = { name: "simple-view", configuration: { title: "My View" } };
            mockAxiosGet(EXAMPLES_URL, [example]);

            const result = await runCli(
                ["asset-registry", "examples", "--assetType", "BOARD_V2"],
                [AssetRegistryModule]
            );

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain("simple-view");
        });

        it("asset-registry skills list: prints skill names and exits 0", async () => {
            mockAxiosGet(SKILLS_URL, skills);

            const result = await runCli(
                ["asset-registry", "skills", "list"],
                [AssetRegistryModule]
            );

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain("board-create");
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

});
