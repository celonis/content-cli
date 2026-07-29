import { mockAxiosPut, mockedPostRequestBodyByUrl } from "../../../utls/http-requests-mock";
import { BranchCommandService } from "../../../../src/commands/configuration-management/branch/branch.command.service";
import { testContext } from "../../../utls/test-context";
import { loggingTestTransport } from "../../../jest.setup";
import { getJsonFromDownloadedFile } from "../../../utls/fs-utils";

describe("branch settings set", () => {
    const packageKey = "my-package";
    const apiUrl = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/branch-settings`;

    it("enables branching and logs status", async () => {
        mockAxiosPut(apiUrl, { branchingEnabled: true });

        await new BranchCommandService(testContext).setBranchingEnabled(packageKey, true, false);

        expect(JSON.parse(mockedPostRequestBodyByUrl.get(apiUrl))).toEqual({ branchingEnabled: true });
        expect(loggingTestTransport.logMessages[0].message).toContain(`Branching enabled for package ${packageKey}.`);
    });

    it("disables branching", async () => {
        mockAxiosPut(apiUrl, { branchingEnabled: false });

        await new BranchCommandService(testContext).setBranchingEnabled(packageKey, false, false);

        expect(JSON.parse(mockedPostRequestBodyByUrl.get(apiUrl))).toEqual({ branchingEnabled: false });
        expect(loggingTestTransport.logMessages[0].message).toContain(`Branching disabled for package ${packageKey}.`);
    });

    it("writes raw transport to JSON when jsonResponse=true", async () => {
        mockAxiosPut(apiUrl, { branchingEnabled: true });

        await new BranchCommandService(testContext).setBranchingEnabled(packageKey, true, true);

        expect(getJsonFromDownloadedFile()).toEqual({ branchingEnabled: true });
    });
});
