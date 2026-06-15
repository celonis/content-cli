import { mockAxiosGet } from "../../utls/http-requests-mock";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

describe("Asset registry schema", () => {
    const schemaResponse = {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "Board",
        type: "object",
        properties: {
            name: { type: "string" },
            components: { type: "array" },
        },
    };

    it("Should get schema and print it", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/schemas/BOARD_V2", schemaResponse);

        await new AssetRegistryService(testContext).getSchema("BOARD_V2", false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        const output = loggingTestTransport.logMessages[0].message;
        expect(output).toContain("Board");
        expect(output).toContain("draft-07");
        expect(output).toContain("properties");
    });

    it("Should get schema and save as JSON file", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/schemas/BOARD_V2", schemaResponse);

        await new AssetRegistryService(testContext).getSchema("BOARD_V2", true);

        const written = getJsonFromDownloadedFile();
        expect(written.$schema).toBe("http://json-schema.org/draft-07/schema#");
        expect(written.title).toBe("Board");
    });
});
