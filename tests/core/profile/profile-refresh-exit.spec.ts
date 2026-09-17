const mockIssuerDiscover = jest.fn();

jest.mock("openid-client", () => ({
    Issuer: { discover: mockIssuerDiscover },
}));

import { AuthenticationType, Profile, ProfileType } from "../../../src/core/profile/profile.interface";
import { ProfileService } from "../../../src/core/profile/profile.service";

describe("ProfileService - refreshProfile keeps the process alive", () => {

    let profileService: ProfileService;
    let exitSpy: jest.SpyInstance;
    let storeSpy: jest.SpyInstance;

    const expiredProfile = (): Profile => ({
        name: "broken",
        team: "https://example.invalid",
        apiToken: "stale-token",
        refreshToken: "revoked-refresh-token",
        authenticationType: AuthenticationType.BEARER,
        type: ProfileType.DEVICE_CODE,
        expiresAt: Math.floor(Date.now() / 1000) - 10,
    });

    beforeEach(() => {
        profileService = new ProfileService();
        exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
        storeSpy = jest.spyOn(profileService, "storeProfile").mockImplementation(async () => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        mockIssuerDiscover.mockReset();
    });

    it("should reject without exiting when the token endpoint rejects the refresh token", async () => {
        mockIssuerDiscover.mockResolvedValue({
            Client: jest.fn().mockImplementation(() => ({
                refresh: jest.fn().mockRejectedValue(new Error("invalid_grant")),
            })),
        });

        await expect(profileService.refreshProfile(expiredProfile()))
            .rejects.toThrow("The profile broken cannot be refreshed.");

        expect(exitSpy).not.toHaveBeenCalled();
        expect(storeSpy).not.toHaveBeenCalled();
    });

    it("should reject without exiting when the team is unreachable", async () => {
        const dnsFailure = Object.assign(new Error("getaddrinfo ENOTFOUND example.invalid"), {
            errno: -3008,
            code: "ENOTFOUND",
            syscall: "getaddrinfo",
        });
        mockIssuerDiscover.mockRejectedValue(dnsFailure);

        await expect(profileService.refreshProfile(expiredProfile()))
            .rejects.toThrow("The profile broken cannot be refreshed.");

        expect(exitSpy).not.toHaveBeenCalled();
        expect(storeSpy).not.toHaveBeenCalled();
    });
});
