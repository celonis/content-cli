import { mockAxiosDelete, mockedAxiosInstance } from "../../../utls/http-requests-mock";
import { BranchCommandService } from "../../../../src/commands/configuration-management/branch/branch.command.service";
import { testContext } from "../../../utls/test-context";
import { loggingTestTransport } from "../../../jest.setup";

describe("branch delete", () => {
    const packageKey = "my-package";
    const branchKey = "feature-a";
    const branchPackageKey = `${packageKey}@${branchKey}`;
    const purgeUrl = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${branchPackageKey}/purge`;

    it("DELETEs the branch's package and logs a success message", async () => {
        mockAxiosDelete(purgeUrl);

        await new BranchCommandService(testContext).deleteBranch(packageKey, branchKey);

        expect(mockedAxiosInstance.delete).toHaveBeenCalledTimes(1);
        expect((mockedAxiosInstance.delete as jest.Mock).mock.calls[0][0]).toBe(purgeUrl);
        expect(loggingTestTransport.logMessages.some((m) => m.message.includes(`Branch ${branchPackageKey} deleted.`))).toBe(true);
    });
});
