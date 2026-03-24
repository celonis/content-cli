import { ProfileService } from "../../../src/core/profile/profile.service";
import { Profile, ProfileType, AuthenticationType } from "../../../src/core/profile/profile.interface";
import { logger } from "../../../src/core/utils/logger";

jest.mock("../../../src/core/profile/profile.service");
jest.mock("../../../src/core/utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
    FatalError: jest.fn().mockImplementation((msg) => new Error(msg)),
}));

import { ProfileCommandService } from "../../../src/commands/profile/profile-command.service";

describe("ProfileCommandService - secureProfile", () => {
    let service: ProfileCommandService;
    let mockFindProfile: jest.Mock;
    let mockStoreProfile: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ProfileCommandService();

        mockFindProfile = jest.fn();
        mockStoreProfile = jest.fn();

        (service as any).profileService = {
            findProfile: mockFindProfile,
            storeProfile: mockStoreProfile,
            readAllProfiles: jest.fn(),
            getDefaultProfile: jest.fn(),
            makeDefaultProfile: jest.fn(),
            authorizeProfile: jest.fn(),
        } as unknown as ProfileService;
    });

    it("should skip migration when profile is already using secure storage", async () => {
        const profile: Profile = {
            name: "already-secure",
            team: "https://test.celonis.cloud",
            type: ProfileType.KEY,
            apiToken: "token",
            authenticationType: AuthenticationType.BEARER,
            secretsStoredSecurely: true,
        };

        mockFindProfile.mockResolvedValue(profile);

        await service.secureProfile("already-secure");

        expect(mockFindProfile).toHaveBeenCalledWith("already-secure");
        expect(mockStoreProfile).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
            'Profile "already-secure" is already using secure storage.'
        );
    });

    it("should migrate plaintext profile to secure storage successfully", async () => {
        const plaintextProfile: Profile = {
            name: "plaintext-profile",
            team: "https://test.celonis.cloud",
            type: ProfileType.KEY,
            apiToken: "my-token",
            authenticationType: AuthenticationType.BEARER,
        };

        const securedProfile: Profile = {
            ...plaintextProfile,
            secretsStoredSecurely: true,
        };

        mockFindProfile
            .mockResolvedValueOnce(plaintextProfile)
            .mockResolvedValueOnce(securedProfile);
        mockStoreProfile.mockResolvedValue(undefined);

        await service.secureProfile("plaintext-profile");

        expect(mockFindProfile).toHaveBeenCalledTimes(2);
        expect(mockStoreProfile).toHaveBeenCalledWith(plaintextProfile);
        expect(logger.info).toHaveBeenCalledWith(
            'Profile "plaintext-profile" secrets have been migrated to secure storage.'
        );
    });

    it("should warn when migration to secure storage fails", async () => {
        const plaintextProfile: Profile = {
            name: "fail-profile",
            team: "https://test.celonis.cloud",
            type: ProfileType.KEY,
            apiToken: "my-token",
            authenticationType: AuthenticationType.BEARER,
        };

        const stillPlaintextProfile: Profile = {
            ...plaintextProfile,
            secretsStoredSecurely: false,
        };

        mockFindProfile
            .mockResolvedValueOnce(plaintextProfile)
            .mockResolvedValueOnce(stillPlaintextProfile);
        mockStoreProfile.mockResolvedValue(undefined);

        await service.secureProfile("fail-profile");

        expect(mockStoreProfile).toHaveBeenCalledWith(plaintextProfile);
        expect(logger.warn).toHaveBeenCalledWith(
            'Failed to migrate profile "fail-profile" to secure storage. Secrets remain in plaintext.'
        );
    });

    it("should propagate errors from findProfile", async () => {
        mockFindProfile.mockRejectedValue("Profile not found");

        await expect(service.secureProfile("nonexistent")).rejects.toBe("Profile not found");
        expect(mockStoreProfile).not.toHaveBeenCalled();
    });
});
