import { AgentSkillsResponse } from "../../../src/commands/asset-registry/asset-registry.interfaces";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

describe("Asset registry skills list", () => {
    const skillsResponse: AgentSkillsResponse = {
        skills: [
            {
                name: "skill-one",
                description: "First platform skill",
                path: "platform/skill-one",
                metadata: { version: "1.0.0" },
            },
            {
                name: "board-authoring",
                description: "",
                path: "asset/BOARD_V2/board-authoring",
                metadata: { version: "2.0.0" },
            },
        ],
    };

    it("Should list all skills with description when present", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/skills", skillsResponse);

        await new AssetRegistryService(testContext).listSkills(false);

        expect(loggingTestTransport.logMessages.length).toBe(2);

        expect(loggingTestTransport.logMessages[0].message).toContain(
            "skill-one (platform/skill-one) - First platform skill"
        );

        expect(loggingTestTransport.logMessages[1].message).toContain(
            "board-authoring (asset/BOARD_V2/board-authoring)"
        );
        expect(loggingTestTransport.logMessages[1].message).not.toMatch(/ - /);
    });

    it("Should list all skills as JSON", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/skills", skillsResponse);

        await new AssetRegistryService(testContext).listSkills(true);

        const written = getJsonFromDownloadedFile() as AgentSkillsResponse;
        expect(written.skills.length).toBe(2);
        expect(written.skills[0].name).toBe("skill-one");
        expect(written.skills[1].path).toBe("asset/BOARD_V2/board-authoring");
    });

    it("Should handle empty skills list", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/asset-registry/skills", { skills: [] });

        await new AssetRegistryService(testContext).listSkills(false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain("No agent skills registered");
    });
});
