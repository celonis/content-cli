import { Profile, ProfileType, AuthenticationType } from "../../../src/core/profile/profile.interface";

jest.doMock("keytar", () => {
    throw new Error("Mock failure in loading lib");
}, { virtual: true });

import { SecureSecretStorageService } from "../../../src/core/profile/secret-storage.service";

describe("SecureSecretStorageService - Keytar Unavailable", () => {
    let service: SecureSecretStorageService;

    beforeEach(() => {
        service = new SecureSecretStorageService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("storeSecrets", () => {
        it("Should return false when keytar module cannot be loaded", async () => {
            const profile: Profile = {
                name: "no-keytar-profile",
                team: "https://test-team.celonis.cloud",
                type: ProfileType.KEY,
                apiToken: "test-token",
                clientSecret: "test-client-secret",
                refreshToken: "test-refresh-token",
                authenticationType: AuthenticationType.BEARER
            };

            const result = await service.storeSecrets(profile);

            expect(result).toBe(false);
        });
    });

    describe("getSecrets", () => {
        it("Should return undefined when keytar module cannot be loaded", async () => {
            const profileName = "no-keytar-profile";
            const result = await service.getSecrets(profileName);

            expect(result).toBeUndefined();
        });
    });
});

