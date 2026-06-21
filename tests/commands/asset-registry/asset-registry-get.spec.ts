import { AssetRegistryDescriptor } from "../../../src/commands/asset-registry/asset-registry.interfaces";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

describe("Asset registry get", () => {
    const boardDescriptor: AssetRegistryDescriptor = {
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

    it("Should get a specific asset type", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/types/BOARD_V2", boardDescriptor);

        await new AssetRegistryService(testContext).getType("BOARD_V2", false);

        const messages = loggingTestTransport.logMessages.map((m) => m.message);
        expect(messages).toEqual(
            expect.arrayContaining([
                expect.stringContaining("BOARD_V2"),
                expect.stringContaining("View"),
                expect.stringContaining("DASHBOARDS"),
                expect.stringContaining("/blueprint/api"),
                expect.stringContaining("/schema/board_v2"),
                expect.stringContaining("/validate/board_v2"),
            ])
        );
        expect(messages.join("\n")).not.toContain("skills:");
    });

    it("Should get a specific asset type as JSON", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/types/BOARD_V2", boardDescriptor);

        await new AssetRegistryService(testContext).getType("BOARD_V2", true);

        const written = getJsonFromDownloadedFile() as AssetRegistryDescriptor;
        expect(written.assetType).toBe("BOARD_V2");
        expect(written.displayName).toBe("View");
        expect(written.service.basePath).toBe("/blueprint/api");
    });

    it("Should include optional endpoints when present", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/types/BOARD_V2", boardDescriptor);

        await new AssetRegistryService(testContext).getType("BOARD_V2", false);

        const messages = loggingTestTransport.logMessages.map((m) => m.message);
        expect(messages).toEqual(
            expect.arrayContaining([
                expect.stringContaining("/examples/board_v2"),
            ])
        );
    });

    it("Should include the skills endpoint when present", async () => {
        const descriptorWithSkillsEndpoint: AssetRegistryDescriptor = {
            ...boardDescriptor,
            endpoints: {
                ...boardDescriptor.endpoints,
                skills: "/skills/board_v2",
            },
        };
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/types/BOARD_V2", descriptorWithSkillsEndpoint);

        await new AssetRegistryService(testContext).getType("BOARD_V2", false);

        const messages = loggingTestTransport.logMessages.map((m) => m.message);
        expect(messages).toEqual(
            expect.arrayContaining([
                expect.stringContaining("/skills/board_v2"),
            ])
        );
    });

    it("Should omit optional endpoints when absent", async () => {
        const descriptorWithoutOptionals: AssetRegistryDescriptor = {
            ...boardDescriptor,
            endpoints: {
                schema: "/schema/board_v2",
                validate: "/validate/board_v2",
            },
        };
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/types/BOARD_V2", descriptorWithoutOptionals);

        await new AssetRegistryService(testContext).getType("BOARD_V2", false);

        const messages = loggingTestTransport.logMessages.map((m) => m.message).join("\n");
        expect(messages).not.toContain("examples");
    });
});
