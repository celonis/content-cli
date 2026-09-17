import Module = require("../../../src/commands/profile/module");
import { createProgram, loadProfileOnDemand } from "../../../src/content-cli";
import { ProfileCommandService } from "../../../src/commands/profile/profile-command.service";
import { Context } from "../../../src/core/command/cli-context";
import { GitProfileService } from "../../../src/core/git-profile/git-profile.service";
import { ProfileService } from "../../../src/core/profile/profile.service";

jest.mock("../../../src/commands/profile/profile-command.service");

describe("Profile commands when the default profile cannot be refreshed", () => {

    let exitSpy: jest.SpyInstance;
    let findProfile: jest.SpyInstance;
    let listProfiles: jest.Mock;
    let createProfile: jest.Mock;
    let defaultProfile: jest.Mock;
    let secureProfile: jest.Mock;

    beforeEach(() => {
        exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);

        jest.spyOn(GitProfileService.prototype, "getDefaultProfile").mockReturnValue(null);
        jest.spyOn(GitProfileService.prototype, "findProfile").mockRejectedValue(new Error("No profile was found"));
        jest.spyOn(ProfileService.prototype, "getDefaultProfile").mockReturnValue("expired-profile");
        findProfile = jest.spyOn(ProfileService.prototype, "findProfile")
            .mockRejectedValue("The profile expired-profile couldn't be resolved.");

        listProfiles = jest.fn().mockResolvedValue(undefined);
        createProfile = jest.fn().mockResolvedValue(undefined);
        defaultProfile = jest.fn().mockResolvedValue(undefined);
        secureProfile = jest.fn().mockResolvedValue(undefined);
        (ProfileCommandService as jest.MockedClass<typeof ProfileCommandService>).mockImplementation(() => ({
            listProfiles,
            createProfile,
            makeDefaultProfile: defaultProfile,
            secureProfile,
        }) as unknown as ProfileCommandService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    async function runProfileCommand(args: string[]): Promise<Context> {
        const context = new Context({});

        const program = createProgram(context, { modules: [Module] });
        loadProfileOnDemand(program, context);
        program.exitOverride();
        await program.parseAsync(["node", "content-cli", ...args]);

        return context;
    }

    it("should run profile list without loading a profile", async () => {
        await runProfileCommand(["profile", "list"]);

        expect(listProfiles).toHaveBeenCalled();
        expect(findProfile).not.toHaveBeenCalled();
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it("should run profile create without loading a profile", async () => {
        await runProfileCommand(["profile", "create", "--setAsDefault"]);

        expect(createProfile).toHaveBeenCalledWith(true);
        expect(findProfile).not.toHaveBeenCalled();
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it("should run profile default without loading a profile", async () => {
        await runProfileCommand(["profile", "default", "replacement"]);

        expect(defaultProfile).toHaveBeenCalledWith("replacement");
        expect(findProfile).not.toHaveBeenCalled();
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it("should run profile secure without loading a profile", async () => {
        await runProfileCommand(["profile", "secure", "broken"]);

        expect(secureProfile).toHaveBeenCalledWith("broken");
        expect(findProfile).not.toHaveBeenCalled();
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it("should leave the context without a profile so content commands still fail", async () => {
        const context = await runProfileCommand(["profile", "list"]);

        expect(context.profile).toBeUndefined();
        expect(() => context.httpClient).toThrow("No profile provided");
    });
});
