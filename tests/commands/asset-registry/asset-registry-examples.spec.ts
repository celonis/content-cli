import { mockAxiosGet } from "../../utls/http-requests-mock";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

describe("Asset registry examples", () => {
    const examplesResponse = [
        { name: "Simple View", configuration: { components: [] } },
        { name: "KPI Dashboard", configuration: { components: [{ type: "kpi" }] } },
    ];

    it("Should get examples and print them", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/examples/BOARD_V2", examplesResponse);

        await new AssetRegistryService(testContext).getExamples("BOARD_V2", false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        const output = loggingTestTransport.logMessages[0].message;
        expect(output).toContain("Simple View");
        expect(output).toContain("KPI Dashboard");
    });

    it("Should get examples and save as JSON file", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/examples/BOARD_V2", examplesResponse);

        await new AssetRegistryService(testContext).getExamples("BOARD_V2", true);

        const written = getJsonFromDownloadedFile();
        expect(written.length).toBe(2);
        expect(written[0].name).toBe("Simple View");
    });
});
