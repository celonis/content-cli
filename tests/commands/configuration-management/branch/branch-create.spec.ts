import { mockAxiosPost, mockedPostRequestBodyByUrl } from "../../../utls/http-requests-mock";
import { BranchCommandService } from "../../../../src/commands/configuration-management/branch/branch.command.service";
import { testContext } from "../../../utls/test-context";
import { loggingTestTransport } from "../../../jest.setup";
import { getJsonFromDownloadedFile } from "../../../utls/fs-utils";
import { FileService } from "../../../../src/core/utils/file-service";
import { BranchTransport, CreateBranchTransport } from "../../../../src/commands/configuration-management/branch/interfaces/branch.interfaces";

describe("branch create", () => {
    const packageKey = "my-package";
    const apiUrl = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/branches`;
    const validateUrl = `${apiUrl}?validate=true`;

    const created: BranchTransport = {
        projectKey: packageKey,
        branchKey: "feature-a",
        sourcePackageKey: packageKey,
        sourceVersion: "1.4.0",
        packageKey: `${packageKey}@feature-a`,
    };

    it("creates a branch and prints summary", async () => {
        mockAxiosPost(apiUrl, created);

        await new BranchCommandService(testContext).createBranch(packageKey, "feature-a", "1.4.0", false, false);

        const requestBody: CreateBranchTransport = JSON.parse(mockedPostRequestBodyByUrl.get(apiUrl) as string);
        expect(requestBody).toEqual({ branchKey: "feature-a", version: "1.4.0" });
        expect(loggingTestTransport.logMessages.some((m) => m.message.includes("Branch Key: feature-a"))).toBe(true);
    });

    it("hits the validate endpoint when --validate is set", async () => {
        mockAxiosPost(validateUrl, undefined);

        await new BranchCommandService(testContext).createBranch(packageKey, "feature-a", "1.4.0", true, false);

        expect(mockedPostRequestBodyByUrl.get(validateUrl)).toBeDefined();
        expect(
            loggingTestTransport.logMessages.some((m) => m.message.includes(FileService.fileDownloadedMessage))
        ).toBe(false);
        expect(
            loggingTestTransport.logMessages.some((m) =>
                m.message.includes(`Validation successful for branch 'feature-a' from ${packageKey}@1.4.0.`)
            )
        ).toBe(true);
    });

    it("writes JSON file when jsonResponse=true", async () => {
        mockAxiosPost(apiUrl, created);

        await new BranchCommandService(testContext).createBranch(packageKey, "feature-a", "1.4.0", false, true);

        expect(getJsonFromDownloadedFile()).toEqual(created);
    });
});
