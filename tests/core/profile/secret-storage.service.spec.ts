import { Profile, ProfileType, AuthenticationType } from "../../../src/core/profile/profile.interface";
import {
    SecureSecretStorageService,
} from "../../../src/core/profile/secret-storage.service";

const mockKeytar = {
    setPassword: jest.fn(),
    findCredentials: jest.fn()
};

jest.mock("keytar", () => {
    return mockKeytar;
}, { virtual: true });

describe("SecureSecretStorageService", () => {
    let service: any;

    beforeEach(() => {
        jest.resetModules();
        
        jest.clearAllMocks();

        mockKeytar.setPassword.mockClear();
        mockKeytar.findCredentials.mockClear();
        
        service = new SecureSecretStorageService();

        const keytarModule = require("keytar");
        expect(keytarModule).toBe(mockKeytar);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("storeSecrets", () => {
        it("Should store all secrets successfully when keytar is available", async () => {
            const profile: Profile = {
                name: "test-profile",
                team: "https://test-team.celonis.cloud",
                type: ProfileType.KEY,
                apiToken: "test-api-token",
                clientSecret: "test-client-secret",
                refreshToken: "test-refresh-token",
                authenticationType: AuthenticationType.BEARER
            };

            // keytar.setPassword returns Promise<void> (resolves to undefined on success)
            mockKeytar.setPassword.mockResolvedValue(undefined);

            const result = await service.storeSecrets(profile);

            expect(result).toBe(true);
            expect(mockKeytar.setPassword).toHaveBeenCalledTimes(3);
            expect(mockKeytar.setPassword).toHaveBeenCalledWith(
                "celonis-content-cli:test-profile",
                "apiToken",
                "test-api-token"
            );
            expect(mockKeytar.setPassword).toHaveBeenCalledWith(
                "celonis-content-cli:test-profile",
                "clientSecret",
                "test-client-secret"
            );
            expect(mockKeytar.setPassword).toHaveBeenCalledWith(
                "celonis-content-cli:test-profile",
                "refreshToken",
                "test-refresh-token"
            );
        });

        it("Should return false when keytar setPassword throws for any secret", async () => {
            const profile: Profile = {
                name: "throwing-profile",
                team: "https://test-team.celonis.cloud",
                type: ProfileType.KEY,
                apiToken: "test-api-token",
                authenticationType: AuthenticationType.BEARER
            };

            mockKeytar.setPassword.mockRejectedValue(new Error("Keychain unavailable"));

            const result = await service.storeSecrets(profile);

            expect(result).toBe(false);
        });

        it("Should skip undefined or null secret values", async () => {
            const profile: Profile = {
                name: "partial-secrets-profile",
                team: "https://test-team.celonis.cloud",
                type: ProfileType.KEY,
                apiToken: "test-api-token",
                clientSecret: undefined,
                refreshToken: null as any,
                authenticationType: AuthenticationType.BEARER
            };

            mockKeytar.setPassword.mockResolvedValue(undefined);

            const result = await service.storeSecrets(profile);

            expect(result).toBe(true);
            expect(mockKeytar.setPassword).toHaveBeenCalledTimes(1);
            expect(mockKeytar.setPassword).toHaveBeenCalledWith(
                "celonis-content-cli:partial-secrets-profile",
                "apiToken",
                "test-api-token"
            );
        });
    });

    describe("getSecrets", () => {
        it("Should retrieve secrets successfully when keytar is available", async () => {
            const profileName = "test-profile";
            const mockSecrets = [
                { account: "apiToken", password: "retrieved-api-token" },
                { account: "clientSecret", password: "retrieved-client-secret" },
                { account: "refreshToken", password: "retrieved-refresh-token" }
            ];

            mockKeytar.findCredentials.mockResolvedValue(mockSecrets);

            const result = await service.getSecrets(profileName);

            expect(result).toEqual({
                apiToken: "retrieved-api-token",
                clientSecret: "retrieved-client-secret",
                refreshToken: "retrieved-refresh-token"
            });
            expect(mockKeytar.findCredentials).toHaveBeenCalledWith("celonis-content-cli:test-profile");
        });

        it("Should return undefined when no secrets are found", async () => {
            const profileName = "non-existent-profile";

            mockKeytar.findCredentials.mockResolvedValue([]);

            const result = await service.getSecrets(profileName);

            expect(result).toBeUndefined();
            expect(mockKeytar.findCredentials).toHaveBeenCalledWith("celonis-content-cli:non-existent-profile");
        });

        it("Should map account names to profile secrets correctly", async () => {
            const profileName = "mapping-test-profile";
            const mockSecrets = [
                { account: "apiToken", password: "token-123" },
                { account: "clientSecret", password: "secret-456" },
                { account: "refreshToken", password: "refresh-789" }
            ];

            mockKeytar.findCredentials.mockResolvedValue(mockSecrets);

            const result = await service.getSecrets(profileName);

            expect(result).toEqual({
                apiToken: "token-123",
                clientSecret: "secret-456",
                refreshToken: "refresh-789"
            });
        });
    });

    describe("service name construction", () => {
        it("Should construct correct service name", async () => {
            const expectedService = { profileName: "profile1", serviceName: "celonis-content-cli:profile1" };

            const profile: Profile = {
                name: expectedService.profileName,
                team: "https://test-team.celonis.cloud",
                type: ProfileType.KEY,
                apiToken: "test-token",
                authenticationType: AuthenticationType.BEARER
            };

            mockKeytar.setPassword.mockResolvedValue(undefined);
            jest.clearAllMocks();

            await service.storeSecrets(profile);

            expect(mockKeytar.setPassword).toHaveBeenCalledWith(
                expectedService.serviceName,
                "apiToken",
                profile.apiToken
            );
        });
    });
});

