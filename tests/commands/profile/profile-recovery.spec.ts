import Module = require("../../../src/commands/profile/module");
import { createProgram } from "../../../src/content-cli";
import { ProfileCommandService } from "../../../src/commands/profile/profile-command.service";
import { Context } from "../../../src/core/command/cli-context";
import { GitProfileService } from "../../../src/core/git-profile/git-profile.service";
import { ProfileService } from "../../../src/core/profile/profile.service";

jest.mock("../../../src/commands/profile/profile-command.service");

describe("Profile commands when the default profile cannot be refreshed", () => {

    let exitSpy: jest.SpyInstance;
    let listProfiles: jest.Mock;
    let createProfile: jest.Mock;

    beforeEach(() => {
        exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);

        jest.spyOn(GitProfileService.prototype, "getDefaultProfile").mockReturnValue(null);
        jest.spyOn(GitProfileService.prototype, "findProfile").mockRejectedValue(new Error("No profile was found"));
        jest.spyOn(ProfileService.prototype, "getDefaultProfile").mockReturnValue("expired-profile");
        jest.spyOn(ProfileService.prototype, "findProfile")
            .mockRejectedValue("The profile expired-profile couldn't be resolved.");

        listProfiles = jest.fn().mockResolvedValue(undefined);
        createProfile = jest.fn().mockResolvedValue(undefined);
        (ProfileCommandService as jest.MockedClass<typeof ProfileCommandService>).mockImplementation(() => ({
            listProfiles,
            createProfile,
        }) as unknown as ProfileCommandService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    async function runProfileCommand(args: string[]): Promise<Context> {
        const context = new Context({});
        await context.init();

        const program = createProgram(context, { modules: [Module] });
        program.exitOverride();
        await program.parseAsync(["node", "content-cli", ...args]);

        return context;
    }

    it("should still run profile list", async () => {
        await runProfileCommand(["profile", "list"]);

        expect(listProfiles).toHaveBeenCalled();
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it("should still run profile create and set the replacement as default", async () => {
        await runProfileCommand(["profile", "create", "--setAsDefault"]);

        expect(createProfile).toHaveBeenCalledWith(true);
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it("should leave the context without a profile so content commands still fail", async () => {
        const context = await runProfileCommand(["profile", "list"]);

        expect(context.profile).toBeUndefined();
        expect(() => context.httpClient).toThrow("No profile provided");
    });
});
