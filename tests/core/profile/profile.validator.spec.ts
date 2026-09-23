import { ProfileValidator } from "../../../src/core/profile/profile.validator";
import { Profile } from "../../../src/core/profile/profile.interface";
import { loggingTestTransport } from "../../jest.setup";

function keyProfile(overrides: Partial<Profile> = {}): Profile {
    return {
        name: "test",
        team: "https://myTeam.celonis.cloud",
        apiToken: "test-token",
        authenticationType: "Bearer",
        type: "Key",
        ...overrides,
    } as Profile;
}

describe("ProfileValidator", () => {

    let exitSpy: jest.SpyInstance;

    beforeEach(() => {
        exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    });

    afterEach(() => {
        exitSpy.mockRestore();
    });

    describe("validateProfile", () => {
        it("should accept a key profile that has an api token", async () => {
            await ProfileValidator.validateProfile(keyProfile());

            expect(exitSpy).not.toHaveBeenCalled();
        });

        it("should reject a key profile without an api token", async () => {
            await ProfileValidator.validateProfile(keyProfile({ apiToken: undefined }));

            expect(exitSpy).toHaveBeenCalledWith(1);
            expect(loggingTestTransport.logMessages[0].message).toContain(
                "The api token can not be empty for this profile type"
            );
        });

        it("should reject a client credentials profile without a client secret", async () => {
            await ProfileValidator.validateProfile(
                keyProfile({ type: "Client Credentials", clientId: "id", clientSecret: undefined })
            );

            expect(exitSpy).toHaveBeenCalledWith(1);
            expect(loggingTestTransport.logMessages[0].message).toContain("The client id and secret can not be empty");
        });
    });

    describe("validateEnvironmentProfile", () => {
        it("should accept a profile without an api token", () => {
            ProfileValidator.validateEnvironmentProfile(keyProfile({ apiToken: undefined }));

            expect(exitSpy).not.toHaveBeenCalled();
        });

        it("should accept a profile that has an api token", () => {
            ProfileValidator.validateEnvironmentProfile(keyProfile());

            expect(exitSpy).not.toHaveBeenCalled();
        });

        it("should reject a profile without a name", () => {
            ProfileValidator.validateEnvironmentProfile(keyProfile({ name: undefined }));

            expect(exitSpy).toHaveBeenCalledWith(1);
            expect(loggingTestTransport.logMessages[0].message).toContain("The name can not be empty");
        });

        it("should reject a profile whose team url is not a valid url", () => {
            ProfileValidator.validateEnvironmentProfile(keyProfile({ team: "not a url" }));

            expect(exitSpy).toHaveBeenCalledWith(1);
            expect(loggingTestTransport.logMessages[0].message).toContain("The provided url is not a valid url.");
        });
    });
});
