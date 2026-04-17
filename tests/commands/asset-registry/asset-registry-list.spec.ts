import { AssetRegistryMetadata } from "../../../src/commands/asset-registry/asset-registry.interfaces";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Asset registry list", () => {
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
                    methodology: "/methodology/board_v2",
                    examples: "/examples/board_v2",
                },
                contributions: { pigEntityTypes: [], dataPipelineEntityTypes: [], actionTypes: [] },
            },
            SEMANTIC_MODEL: {
                assetType: "SEMANTIC_MODEL",
                displayName: "Knowledge Model",
                description: "Defines KPIs, records, filters, and data bindings for analytics",
                group: "DATA_AND_PROCESS_MODELING",
                assetSchema: { version: "2.1.0" },
                service: { basePath: "/semantic-layer/api" },
                endpoints: {
                    schema: "/schema",
                    validate: "/validate",
                    methodology: "/methodology",
                    examples: "/examples",
                },
                contributions: { pigEntityTypes: [], dataPipelineEntityTypes: [], actionTypes: [] },
            },
        },
    };

    it("Should list all asset types", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/types", metadata);

        await new AssetRegistryService(testContext).listTypes(false);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain("BOARD_V2");
        expect(loggingTestTransport.logMessages[0].message).toContain("View");
        expect(loggingTestTransport.logMessages[0].message).toContain("DASHBOARDS");
        expect(loggingTestTransport.logMessages[1].message).toContain("SEMANTIC_MODEL");
        expect(loggingTestTransport.logMessages[1].message).toContain("Knowledge Model");
    });

    it("Should list all asset types as JSON", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/types", metadata);

        await new AssetRegistryService(testContext).listTypes(true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            { encoding: "utf-8", mode: 0o600 }
        );

        const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as AssetRegistryMetadata;
        expect(Object.keys(written.types).length).toBe(2);
        expect(written.types["BOARD_V2"].assetType).toBe("BOARD_V2");
        expect(written.types["SEMANTIC_MODEL"].assetType).toBe("SEMANTIC_MODEL");
    });

    it("Should handle empty registry", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/types", { types: {} });

        await new AssetRegistryService(testContext).listTypes(false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain("No asset types registered");
    });
});
