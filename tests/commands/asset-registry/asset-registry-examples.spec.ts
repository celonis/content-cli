import { mockAxiosGet } from "../../utls/http-requests-mock";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

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

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            { encoding: "utf-8" }
        );

        const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
        expect(written.length).toBe(2);
        expect(written[0].name).toBe("Simple View");
    });
});
