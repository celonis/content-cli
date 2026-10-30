import { SdkService } from "../../../src/commands/sdk/sdk.service";
import { ProfileService } from "../../../src/core/profile/profile.service";
import { Context } from "../../../src/core/command/cli-context";
import { testContext } from "../../utls/test-context";

describe("SDK token", () => {
    let acquireScopedToken: jest.SpyInstance;
    let stdoutWrite: jest.SpyInstance;

    beforeEach(() => {
        acquireScopedToken = jest.spyOn(ProfileService.prototype, "acquireScopedToken").mockResolvedValue("sdk-token");
        stdoutWrite = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("Should print the acquired token", async () => {
        await new SdkService(testContext).printToken();

        expect(stdoutWrite).toHaveBeenCalledWith("sdk-token\n");
    });

    it("Should acquire the token with the SDK read scope only", async () => {
        await new SdkService(testContext).printToken();

        expect(acquireScopedToken).toHaveBeenCalledWith(testContext.profile, ["pro-code-app-manager.sdk:read"]);
    });

    it("Should fail when no profile is available", async () => {
        await expect(new SdkService(new Context({})).printToken()).rejects.toThrow("No profile provided");

        expect(acquireScopedToken).not.toHaveBeenCalled();
    });
});
