import { mockAxiosGet } from "../../utls/http-requests-mock";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Asset registry methodology", () => {
    const methodologyResponse = {
        title: "View Best Practices",
        sections: [
            { heading: "Layout", content: "Use a responsive grid layout." },
            { heading: "KPIs", content: "Place KPIs at the top." },
        ],
    };

    it("Should get methodology and print it", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/methodologies/BOARD_V2", methodologyResponse);

        await new AssetRegistryService(testContext).getMethodology("BOARD_V2", false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        const output = loggingTestTransport.logMessages[0].message;
        expect(output).toContain("View Best Practices");
        expect(output).toContain("Layout");
    });

    it("Should get methodology and save as JSON file", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/methodologies/BOARD_V2", methodologyResponse);

        await new AssetRegistryService(testContext).getMethodology("BOARD_V2", true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            { encoding: "utf-8", mode: 0o600 }
        );

        const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
        expect(written.title).toBe("View Best Practices");
        expect(written.sections.length).toBe(2);
    });
});
