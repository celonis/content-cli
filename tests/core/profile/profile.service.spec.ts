import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ProfileValidator } from "../../../src/core/profile/profile.validator";
import { Profile, ProfileType, AuthenticationType } from "../../../src/core/profile/profile.interface";

const mockHomedir = "/mock/home";

jest.mock("os", () => ({
    homedir: jest.fn(() => mockHomedir)
}));

const mockStoreSecrets = jest.fn();
const mockGetSecrets = jest.fn();

jest.mock("../../../src/core/profile/secret-storage.service", () => ({
    SecureSecretStorageService: jest.fn().mockImplementation(() => ({
        storeSecrets: mockStoreSecrets,
        getSecrets: mockGetSecrets
    }))
}));

import { ProfileService } from "../../../src/core/profile/profile.service";

describe("ProfileService - mapCelonisEnvProfile", () => {
    let profileService: ProfileService;
    let originalCelonisUrl: string | undefined;
    let originalCelonisApiToken: string | undefined;
    let originalTeamUrl: string | undefined;
    let originalApiToken: string | undefined;

    beforeEach(() => {
        profileService = new ProfileService();
        
        mockStoreSecrets.mockClear();
        mockGetSecrets.mockClear();
        
        originalCelonisUrl = process.env.CELONIS_URL;
        originalCelonisApiToken = process.env.CELONIS_API_TOKEN;
        originalTeamUrl = process.env.TEAM_URL;
        originalApiToken = process.env.API_TOKEN;
    });

    afterEach(() => {
        if (originalCelonisUrl !== undefined) {
            process.env.CELONIS_URL = originalCelonisUrl;
        } else {
            delete process.env.CELONIS_URL;
        }

        if (originalCelonisApiToken !== undefined) {
            process.env.CELONIS_API_TOKEN = originalCelonisApiToken;
        } else {
            delete process.env.CELONIS_API_TOKEN;
        }

        if (originalTeamUrl !== undefined) {
            process.env.TEAM_URL = originalTeamUrl;
        } else {
            delete process.env.TEAM_URL;
        }

        if (originalApiToken !== undefined) {
            process.env.API_TOKEN = originalApiToken;
        } else {
            delete process.env.API_TOKEN;
        }
    });

    describe("when CELONIS_URL is not set", () => {
        it("should throw an error when trying to call startsWith on undefined", () => {
            delete process.env.CELONIS_URL;
            delete process.env.TEAM_URL;
            delete process.env.API_TOKEN;

            expect(() => {
                (profileService as any).mapCelonisEnvProfile();
            }).toThrow(TypeError);
        });
    });

    describe("when CELONIS_URL is set", () => {
        it("should set TEAM_URL to CELONIS_URL when it already starts with https://", () => {
            process.env.CELONIS_URL = "https://example.celonis.cloud";
            delete process.env.TEAM_URL;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.TEAM_URL).toBe("https://example.celonis.cloud");
        });

        it("should prepend https:// to CELONIS_URL when it does not start with https://", () => {
            process.env.CELONIS_URL = "example.celonis.cloud";
            delete process.env.TEAM_URL;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.TEAM_URL).toBe("https://example.celonis.cloud");
        });

        it("should leave CELONIS_URL unchanged when it starts with http://", () => {
            process.env.CELONIS_URL = "http://example.celonis.cloud";
            delete process.env.TEAM_URL;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.TEAM_URL).toBe("http://example.celonis.cloud");
        });

        it("should handle CELONIS_URL with path and prepend https://", () => {
            process.env.CELONIS_URL = "example.celonis.cloud/path/to/resource";
            delete process.env.TEAM_URL;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.TEAM_URL).toBe("https://example.celonis.cloud/path/to/resource");
        });

        it("should handle CELONIS_URL with port and prepend https://", () => {
            process.env.CELONIS_URL = "example.celonis.cloud:8080";
            delete process.env.TEAM_URL;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.TEAM_URL).toBe("https://example.celonis.cloud:8080");
        });
    });

    describe("when CELONIS_API_TOKEN is set", () => {
        it("should set API_TOKEN to CELONIS_API_TOKEN when CELONIS_URL starts with https://", () => {
            process.env.CELONIS_URL = "https://example.celonis.cloud";
            process.env.CELONIS_API_TOKEN = "test-api-token";
            delete process.env.API_TOKEN;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.API_TOKEN).toBe("test-api-token");
            expect(process.env.TEAM_URL).toBe("https://example.celonis.cloud");
        });

        it("should set API_TOKEN to CELONIS_API_TOKEN when CELONIS_URL does not start with https://", () => {
            process.env.CELONIS_URL = "example.celonis.cloud";
            process.env.CELONIS_API_TOKEN = "test-api-token";
            delete process.env.API_TOKEN;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.API_TOKEN).toBe("test-api-token");
            expect(process.env.TEAM_URL).toBe("https://example.celonis.cloud");
        });

        it("should set API_TOKEN to CELONIS_API_TOKEN when CELONIS_URL starts with http://", () => {
            process.env.CELONIS_URL = "http://example.celonis.cloud";
            process.env.CELONIS_API_TOKEN = "test-api-token";
            delete process.env.API_TOKEN;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.API_TOKEN).toBe("test-api-token");
            expect(process.env.TEAM_URL).toBe("http://example.celonis.cloud");
        });
    });

    describe("when CELONIS_API_TOKEN is not set", () => {
        it("should delete API_TOKEN when CELONIS_URL starts with https://", () => {
            process.env.CELONIS_URL = "https://example.celonis.cloud";
            process.env.API_TOKEN = "existing-token";
            delete process.env.CELONIS_API_TOKEN;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.API_TOKEN).toBeUndefined();
            expect(process.env.TEAM_URL).toBe("https://example.celonis.cloud");
        });

        it("should delete API_TOKEN when CELONIS_URL does not start with https://", () => {
            process.env.CELONIS_URL = "example.celonis.cloud";
            process.env.API_TOKEN = "existing-token";
            delete process.env.CELONIS_API_TOKEN;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.API_TOKEN).toBeUndefined();
            expect(process.env.TEAM_URL).toBe("https://example.celonis.cloud");
        });

        it("should delete API_TOKEN when CELONIS_URL starts with http://", () => {
            process.env.CELONIS_URL = "http://example.celonis.cloud";
            process.env.API_TOKEN = "existing-token";
            delete process.env.CELONIS_API_TOKEN;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.API_TOKEN).toBeUndefined();
            expect(process.env.TEAM_URL).toBe("http://example.celonis.cloud");
        });
    });

    describe("combined scenarios", () => {
        it("should handle URL without https:// and set API_TOKEN when both are provided", () => {
            process.env.CELONIS_URL = "example.celonis.cloud";
            process.env.CELONIS_API_TOKEN = "my-token-123";
            delete process.env.TEAM_URL;
            delete process.env.API_TOKEN;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.TEAM_URL).toBe("https://example.celonis.cloud");
            expect(process.env.API_TOKEN).toBe("my-token-123");
        });

        it("should handle URL with https:// and delete API_TOKEN when token is not provided", () => {
            process.env.CELONIS_URL = "https://example.celonis.cloud";
            process.env.API_TOKEN = "old-token";
            delete process.env.CELONIS_API_TOKEN;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.TEAM_URL).toBe("https://example.celonis.cloud");
            expect(process.env.API_TOKEN).toBeUndefined();
        });
    });
});

describe("ProfileService - findProfile", () => {
    let profileService: ProfileService;
    let originalCelonisUrl: string | undefined;
    let originalCelonisApiToken: string | undefined;
    let originalTeamUrl: string | undefined;
    let originalApiToken: string | undefined;
    const mockProfilePath = path.resolve(mockHomedir, ".celonis-content-cli-profiles");

    beforeEach(() => {
        (os.homedir as jest.Mock).mockReturnValue(mockHomedir);
        profileService = new ProfileService();
        
        mockStoreSecrets.mockClear();
        mockGetSecrets.mockClear();
        
        originalCelonisUrl = process.env.CELONIS_URL;
        originalCelonisApiToken = process.env.CELONIS_API_TOKEN;
        originalTeamUrl = process.env.TEAM_URL;
        originalApiToken = process.env.API_TOKEN;

        jest.spyOn(ProfileValidator, "validateProfile").mockResolvedValue(AuthenticationType.BEARER);
    });

    afterEach(() => {
        jest.clearAllMocks();

        if (originalCelonisUrl !== undefined) {
            process.env.CELONIS_URL = originalCelonisUrl;
        } else {
            delete process.env.CELONIS_URL;
        }

        if (originalCelonisApiToken !== undefined) {
            process.env.CELONIS_API_TOKEN = originalCelonisApiToken;
        } else {
            delete process.env.CELONIS_API_TOKEN;
        }

        if (originalTeamUrl !== undefined) {
            process.env.TEAM_URL = originalTeamUrl;
        } else {
            delete process.env.TEAM_URL;
        }

        if (originalApiToken !== undefined) {
            process.env.API_TOKEN = originalApiToken;
        } else {
            delete process.env.API_TOKEN;
        }
    });

    describe("when profileName is provided and profile file exists", () => {
        it("should load profile from file and ignore environment variables", async () => {
            const profileName = "test-profile";
            const mockProfile: Profile = {
                name: profileName,
                team: "https://example.celonis.cloud",
                apiToken: "profile-token",
                authenticationType: AuthenticationType.BEARER,
                type: ProfileType.KEY
            };

            const profileFilePath = path.resolve(mockProfilePath, `${profileName}.json`);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockProfile));

            process.env.TEAM_URL = "https://env.celonis.cloud";
            process.env.API_TOKEN = "env-token";

            jest.spyOn(profileService, "refreshProfile").mockResolvedValue(undefined);

            const result = await profileService.findProfile(profileName);

            expect(fs.readFileSync).toHaveBeenCalledWith(profileFilePath, { encoding: "utf-8" });
            expect(result).toEqual(mockProfile);
            expect(profileService.refreshProfile).toHaveBeenCalledWith(mockProfile);
        });

        it("should call refreshProfile before resolving", async () => {
            const profileName = "test-profile";
            const mockProfile: Profile = {
                name: profileName,
                team: "https://example.celonis.cloud",
                apiToken: "profile-token",
                authenticationType: AuthenticationType.BEARER,
                type: ProfileType.KEY
            };

            const profileFilePath = path.resolve(mockProfilePath, `${profileName}.json`);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockProfile));

            const refreshProfileSpy = jest.spyOn(profileService, "refreshProfile").mockResolvedValue(undefined);

            await profileService.findProfile(profileName);

            expect(refreshProfileSpy).toHaveBeenCalledWith(mockProfile);
        });
    });

    describe("when profileName is not provided", () => {
        it("should use TEAM_URL and API_TOKEN from environment when both are set", async () => {
            delete process.env.CELONIS_URL;
            process.env.TEAM_URL = "https://env.celonis.cloud";
            process.env.API_TOKEN = "env-token";

            const result = await profileService.findProfile("");

            expect(result.name).toBe("https://env.celonis.cloud");
            expect(result.team).toBe("https://env.celonis.cloud");
            expect(result.apiToken).toBe("env-token");
            expect(result.type).toBe(ProfileType.KEY);
            expect(ProfileValidator.validateProfile).toHaveBeenCalled();
        });

        it("should use CELONIS_URL and CELONIS_API_TOKEN when TEAM_URL and API_TOKEN are not set", async () => {
            process.env.CELONIS_URL = "https://celonis.celonis.cloud";
            process.env.CELONIS_API_TOKEN = "celonis-token";
            delete process.env.TEAM_URL;
            delete process.env.API_TOKEN;

            const mapCelonisEnvProfileSpy = jest.spyOn(profileService as any, "mapCelonisEnvProfile");

            const result = await profileService.findProfile("");

            expect(mapCelonisEnvProfileSpy).toHaveBeenCalled();
            expect(process.env.TEAM_URL).toBe("https://celonis.celonis.cloud");
            expect(process.env.API_TOKEN).toBe("celonis-token");
            expect(result.name).toBe("https://celonis.celonis.cloud");
            expect(result.team).toBe("https://celonis.celonis.cloud");
            expect(result.apiToken).toBe("celonis-token");
        });

        it("should map CELONIS_URL without https:// and prepend it", async () => {
            process.env.CELONIS_URL = "celonis.celonis.cloud";
            process.env.CELONIS_API_TOKEN = "celonis-token";
            delete process.env.TEAM_URL;
            delete process.env.API_TOKEN;

            const result = await profileService.findProfile("");

            expect(process.env.TEAM_URL).toBe("https://celonis.celonis.cloud");
            expect(result.team).toBe("https://celonis.celonis.cloud");
        });

        it("should reject when CELONIS_API_TOKEN is not set but CELONIS_URL is set", async () => {
            process.env.CELONIS_URL = "https://celonis.celonis.cloud";
            process.env.API_TOKEN = "old-token";
            delete process.env.CELONIS_API_TOKEN;
            delete process.env.TEAM_URL;

            const profileName = "";

            await expect(profileService.findProfile(profileName)).rejects.toBe(
                `The profile ${profileName} couldn't be resolved due to missing environment variables.`
            );
        });

        it("should reject when no environment variables are set", async () => {
            delete process.env.TEAM_URL;
            delete process.env.API_TOKEN;
            delete process.env.CELONIS_URL;
            delete process.env.CELONIS_API_TOKEN;

            const profileName = "";

            await expect(profileService.findProfile(profileName)).rejects.toBe(
                `The profile ${profileName} couldn't be resolved due to missing environment variables.`
            );
        });

        it("should reject when only CELONIS_URL is set without CELONIS_API_TOKEN", async () => {
            process.env.CELONIS_URL = "https://celonis.celonis.cloud";
            delete process.env.CELONIS_API_TOKEN;
            delete process.env.TEAM_URL;
            delete process.env.API_TOKEN;

            const profileName = "";

            await expect(profileService.findProfile(profileName)).rejects.toBe(
                `The profile ${profileName} couldn't be resolved due to missing environment variables.`
            );
        });

        it("should reject when only CELONIS_API_TOKEN is set without CELONIS_URL", async () => {
            process.env.CELONIS_API_TOKEN = "celonis-token";
            delete process.env.CELONIS_URL;
            delete process.env.TEAM_URL;
            delete process.env.API_TOKEN;

            const profileName = "";

            await expect(profileService.findProfile(profileName)).rejects.toBe(
                `The profile ${profileName} couldn't be resolved due to missing environment variables.`
            );
        });
    });

    describe("when profileName is provided but profile file does not exist", () => {
        it("should reject with error message", async () => {
            const profileName = "non-existent-profile";
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error("File not found");
            });

            await expect(profileService.findProfile(profileName)).rejects.toBe(
                `The profile ${profileName} couldn't be resolved.`
            );
        });
    });

    describe("priority of profile vs environment variables", () => {
        it("should prioritize profile file over environment variables when both exist", async () => {
            const profileName = "test-profile";
            const mockProfile: Profile = {
                name: profileName,
                team: "https://profile.celonis.cloud",
                apiToken: "profile-token",
                authenticationType: AuthenticationType.BEARER,
                type: ProfileType.KEY
            };

            const profileFilePath = path.resolve(mockProfilePath, `${profileName}.json`);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockProfile));

            process.env.TEAM_URL = "https://env.celonis.cloud";
            process.env.API_TOKEN = "env-token";
            process.env.CELONIS_URL = "https://celonis.celonis.cloud";
            process.env.CELONIS_API_TOKEN = "celonis-token";

            jest.spyOn(profileService, "refreshProfile").mockResolvedValue(undefined);

            const result = await profileService.findProfile(profileName);

            expect(result.team).toBe("https://profile.celonis.cloud");
            expect(result.apiToken).toBe("profile-token");
            expect(fs.readFileSync).toHaveBeenCalledWith(profileFilePath, { encoding: "utf-8" });
        });
    });

    describe("error handling", () => {
        it("should reject when profile file read fails", async () => {
            const profileName = "test-profile";
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error("Read error");
            });

            await expect(profileService.findProfile(profileName)).rejects.toBe(
                `The profile ${profileName} couldn't be resolved.`
            );
        });

        it("should reject when profile JSON is invalid", async () => {
            const profileName = "test-profile";
            (fs.readFileSync as jest.Mock).mockReturnValue("invalid json");

            await expect(profileService.findProfile(profileName)).rejects.toBe(
                `The profile ${profileName} couldn't be resolved.`
            );
        });
    });
});

describe("Profile Service - Store Profile", () => {
    let profileService: ProfileService;
    const mockProfilePath = path.resolve(mockHomedir, ".celonis-content-cli-profiles");

    beforeEach(() => {
        profileService = new ProfileService();

        mockStoreSecrets.mockClear();
        mockGetSecrets.mockClear();

        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.mkdirSync as jest.Mock).mockImplementation(() => void 0);
        (fs.writeFileSync as jest.Mock).mockImplementation(() => void 0);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("Should store secrets in plain text if keychain storage fails", async () => {
        const profile: Profile = {
            name: "plain-text-profile",
            team: "https://test-team.celonis.cloud",
            type: ProfileType.KEY,
            apiToken: "test-token",
            clientSecret: "client-secret",
            refreshToken: "refresh-token",
            authenticationType: AuthenticationType.BEARER,
            secretsStoredSecurely: false
        };

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        mockStoreSecrets.mockResolvedValue(false);

        await profileService.storeProfile(profile);

        const expectedProfile = {
            ...profile,
            team: "https://test-team.celonis.cloud"
        };

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            path.resolve(mockProfilePath, "plain-text-profile.json"),
            JSON.stringify(expectedProfile),
            { encoding: "utf-8" }
        );
    });

    it("Should remove all secrets from profile when stored securely", async () => {
        const profile: Profile = {
            name: "secure-profile",
            team: "https://test-team.celonis.cloud",
            type: ProfileType.CLIENT_CREDENTIALS,
            clientId: "test-client-id",
            clientSecret: "test-client-secret",
            apiToken: "test-token",
            refreshToken: "test-refresh-token",
            authenticationType: AuthenticationType.BEARER
        };

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        mockStoreSecrets.mockResolvedValue(true);

        await profileService.storeProfile(profile);

        const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
        const storedProfile = JSON.parse(writeCall[1]);

        expect(storedProfile.apiToken).toBeUndefined();
        expect(storedProfile.clientSecret).toBeUndefined();
        expect(storedProfile.refreshToken).toBeUndefined();
        expect(storedProfile.secretsStoredSecurely).toBe(true);
    });
});

describe("Profile Service - Find Profile", () => {
    let profileService: ProfileService;
    const mockProfilePath = path.resolve(mockHomedir, ".celonis-content-cli-profiles");

    beforeEach(() => {
        profileService = new ProfileService();

        mockStoreSecrets.mockClear();
        mockGetSecrets.mockClear();

        // Clear environment variables to avoid env-based profile resolution
        delete process.env.TEAM_URL;
        delete process.env.API_TOKEN;
        delete process.env.CELONIS_URL;
        delete process.env.CELONIS_API_TOKEN;

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockImplementation(() => "{}");

        // Mock refreshProfile to avoid OAuth calls
        jest.spyOn(ProfileService.prototype, "refreshProfile").mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.TEAM_URL;
        delete process.env.API_TOKEN;
        delete process.env.CELONIS_URL;
        delete process.env.CELONIS_API_TOKEN;
    });

    it("Should find profile with secrets stored securely", async () => {
        const profileName = "secure-profile";
        const storedProfile = {
            name: profileName,
            team: "https://test-team.celonis.cloud",
            type: ProfileType.KEY,
            authenticationType: AuthenticationType.BEARER,
            secretsStoredSecurely: true
        };

        const secureSecrets = {
            apiToken: "secure-api-token",
            refreshToken: "secure-refresh-token",
            clientSecret: "secure-client-secret"
        };

        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(storedProfile));
        mockGetSecrets.mockResolvedValue(secureSecrets);

        const profile = await profileService.findProfile(profileName);

        expect(mockGetSecrets).toHaveBeenCalledWith(profileName);
        expect(profile.name).toBe(profileName);
        expect(profile.team).toBe("https://test-team.celonis.cloud");
        expect(profile.apiToken).toBe(secureSecrets.apiToken);
        expect(profile.refreshToken).toBe(secureSecrets.refreshToken);
        expect(profile.clientSecret).toBe(secureSecrets.clientSecret);
        expect(profile.secretsStoredSecurely).toBe(true);
    });

    it("Should find profile with secrets not stored securely", async () => {
        const profileName = "plain-text-profile";
        const storedProfile = {
            name: profileName,
            team: "https://test-team.celonis.cloud",
            type: ProfileType.KEY,
            authenticationType: AuthenticationType.BEARER,
            apiToken: "plain-api-token",
            refreshToken: "plain-refresh-token",
            clientSecret: "plain-client-secret"
        };

        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(storedProfile));

        const profile = await profileService.findProfile(profileName);

        expect(mockGetSecrets).not.toHaveBeenCalled();
        expect(profile.name).toBe(profileName);
        expect(profile.team).toBe("https://test-team.celonis.cloud");
        expect(profile.apiToken).toBe(storedProfile.apiToken);
        expect(profile.refreshToken).toBe(storedProfile.refreshToken);
        expect(profile.clientSecret).toBe(storedProfile.clientSecret);
        expect(profile.secretsStoredSecurely).toBeUndefined();
    });

    it("Should throw error when secrets are stored securely but could not be retrieved", async () => {
        const profileName = "secure-profile-fail";
        const storedProfile = {
            name: profileName,
            team: "https://test-team.celonis.cloud",
            type: ProfileType.KEY,
            authenticationType: AuthenticationType.BEARER,
            secretsStoredSecurely: true
        };

        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(storedProfile));
        mockGetSecrets.mockResolvedValue(undefined);

        await expect(profileService.findProfile(profileName)).rejects.toBe("Failed to read secrets from system keychain.");
        expect(mockGetSecrets).toHaveBeenCalledWith(profileName);
    });
});

