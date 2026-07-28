import { mockAxiosGet } from "../../../utls/http-requests-mock";
import { BranchCommandService } from "../../../../src/commands/configuration-management/branch/branch.command.service";
import { testContext } from "../../../utls/test-context";
import { loggingTestTransport } from "../../../jest.setup";
import { getJsonFromDownloadedFile } from "../../../utls/fs-utils";
import { BranchTransport } from "../../../../src/commands/configuration-management/branch/interfaces/branch.interfaces";

describe("branch list", () => {
    const packageKey = "my-package";
    const apiUrl = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/branches`;

    const branches: BranchTransport[] = [
        {
            projectKey: packageKey,
            branchKey: "feature-a",
            sourcePackageKey: packageKey,
            sourceVersion: "1.4.0",
            packageKey: `${packageKey}@feature-a`,
        },
        {
            projectKey: packageKey,
            branchKey: "release",
            sourcePackageKey: packageKey,
            sourceVersion: "1.5.0",
            packageKey: `${packageKey}@release`,
        },
    ];

    it("lists branches and prints one line per branch", async () => {
        mockAxiosGet(apiUrl, branches);

        await new BranchCommandService(testContext).listBranches(packageKey, false);

        const messages = loggingTestTransport.logMessages.map((m) => m.message);
        expect(messages.some((m) => m.includes(`feature-a (package: ${packageKey}@feature-a`))).toBe(true);
        expect(messages.some((m) => m.includes(`release (package: ${packageKey}@release`))).toBe(true);
    });

    it("logs a friendly message when there are no branches", async () => {
        mockAxiosGet(apiUrl, []);

        await new BranchCommandService(testContext).listBranches(packageKey, false);

        expect(loggingTestTransport.logMessages[0].message).toContain(`No branches found for ${packageKey}.`);
    });

    it("writes the raw transport list to a JSON file when jsonResponse=true", async () => {
        mockAxiosGet(apiUrl, branches);

        await new BranchCommandService(testContext).listBranches(packageKey, true);

        expect(getJsonFromDownloadedFile()).toEqual(branches);
    });
});
