import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ProfileValidator } from "../../../src/core/profile/profile.validator";
import { Profile, ProfileType, AuthenticationType } from "../../../src/core/profile/profile.interface";

jest.mock("os", () => ({
    homedir: jest.fn(() => "/mock/home")
}));

const mockIssuerDiscover = jest.fn();
jest.mock("openid-client", () => ({
    Issuer: {
        discover: (...args: any[]) => mockIssuerDiscover(...args),
    },
}));

jest.mock("../../../src/core/utils/logger", () => ({
    logger: { error: jest.fn(), info: jest.fn() },
    FatalError: class FatalError extends Error {
        constructor(m: string) {
            super(m);
            this.name = "FatalError";
        }
    },
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
    const mockHomedir = "/mock/home";
    const mockProfilePath = path.resolve(mockHomedir, ".celonis-content-cli-profiles");

    beforeEach(() => {
        (os.homedir as jest.Mock).mockReturnValue(mockHomedir);
        profileService = new ProfileService();
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

describe("ProfileService - getScopeCombinationsOrderedBySize", () => {
    let profileService: ProfileService;

    beforeEach(() => {
        profileService = new ProfileService();
    });

    it("should return 15 combinations for 4 scopes", () => {
        const scopes = ["a", "b", "c", "d"];
        const result = (profileService as any).getScopeCombinationsOrderedBySize(scopes);
        expect(result).toHaveLength(15);
    });

    it("should order by size descending: first 1 combination of 4, then 4 of 3, then 6 of 2, then 4 of 1", () => {
        const scopes = ["a", "b", "c", "d"];
        const result = (profileService as any).getScopeCombinationsOrderedBySize(scopes);
        expect(result[0]).toHaveLength(4);
        expect(result[0]).toEqual(["a", "b", "c", "d"]);
        const size3 = result.slice(1, 5);
        expect(size3.every((s: string[]) => s.length === 3)).toBe(true);
        expect(size3).toHaveLength(4);
        const size2 = result.slice(5, 11);
        expect(size2.every((s: string[]) => s.length === 2)).toBe(true);
        expect(size2).toHaveLength(6);
        const size1 = result.slice(11, 15);
        expect(size1.every((s: string[]) => s.length === 1)).toBe(true);
        expect(size1).toHaveLength(4);
    });

    it("should return each combination once (order within set does not matter)", () => {
        const scopes = ["studio", "package-manager", "integration.data-pools", "action-engine.projects"];
        const result = (profileService as any).getScopeCombinationsOrderedBySize(scopes);
        const sorted = result.map((combo: string[]) => [...combo].sort());
        const unique = new Set(sorted.map((s: string[]) => s.join(",")));
        expect(unique.size).toBe(15);
    });
});

describe("ProfileService - extractScopesFromTokenSet", () => {
    let profileService: ProfileService;

    beforeEach(() => {
        profileService = new ProfileService();
    });

    it("should return scopes from token response when scope is present", () => {
        const tokenSet = { scope: "studio package-manager integration.data-pools" };
        const fallback = ["fallback"];
        const result = (profileService as any).extractScopesFromTokenSet(tokenSet, fallback);
        expect(result).toEqual(["studio", "package-manager", "integration.data-pools"]);
    });

    it("should return fallback when token response has no scope", () => {
        const tokenSet = {};
        const fallback = ["studio", "package-manager"];
        const result = (profileService as any).extractScopesFromTokenSet(tokenSet, fallback);
        expect(result).toEqual(["studio", "package-manager"]);
    });

    it("should return fallback when scope is empty string", () => {
        const tokenSet = { scope: "   " };
        const fallback = ["fallback"];
        const result = (profileService as any).extractScopesFromTokenSet(tokenSet, fallback);
        expect(result).toEqual(["fallback"]);
    });

    it("should trim and split single scope", () => {
        const tokenSet = { scope: "  studio  " };
        const fallback = ["fallback"];
        const result = (profileService as any).extractScopesFromTokenSet(tokenSet, fallback);
        expect(result).toEqual(["studio"]);
    });
});

describe("ProfileService - authorizeProfile (device code)", () => {
    let profileService: ProfileService;
    let mockClientInstance: { deviceAuthorization: jest.Mock };

    beforeEach(() => {
        profileService = new ProfileService();
        mockIssuerDiscover.mockReset();
        mockClientInstance = {
            deviceAuthorization: jest.fn(),
        };
        mockIssuerDiscover.mockResolvedValue({
            Client: jest.fn().mockReturnValue(mockClientInstance),
        });
    });

    it("should throw FatalError when both scope attempts fail", async () => {
        mockClientInstance.deviceAuthorization.mockRejectedValue(new Error("invalid_scope"));

        const profile: Profile = {
            name: "test",
            team: "https://example.celonis.cloud",
            apiToken: "",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.DEVICE_CODE,
        };

        await expect(profileService.authorizeProfile(profile)).rejects.toThrow("Device code authorization failed");
    });

    it("should set profile token when second scope attempt succeeds", async () => {
        const tokenSet = {
            access_token: "access-123",
            refresh_token: "refresh-456",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
        };
        const mockPoll = jest.fn().mockResolvedValue(tokenSet);
        mockClientInstance.deviceAuthorization
            .mockRejectedValueOnce(new Error("invalid_scope"))
            .mockResolvedValueOnce({ verification_uri_complete: "https://example.com/device", poll: mockPoll });

        const profile: Profile = {
            name: "test",
            team: "https://example.celonis.cloud",
            apiToken: "",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.DEVICE_CODE,
        };

        await profileService.authorizeProfile(profile);

        expect(profile.apiToken).toBe("access-123");
        expect(profile.refreshToken).toBe("refresh-456");
        expect(profile.expiresAt).toBe(tokenSet.expires_at);
    });
});

describe("ProfileService - authorizeProfile (client credentials)", () => {
    let profileService: ProfileService;

    beforeEach(() => {
        profileService = new ProfileService();
        mockIssuerDiscover.mockResolvedValue({});
    });

    it("should set profile scopes and token when tryClientCredentialsGrant returns result", async () => {
        const tokenSet = {
            access_token: "token-123",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            scope: "studio package-manager",
        };
        const tryGrantSpy = jest.spyOn(profileService as any, "tryClientCredentialsGrant")
            .mockResolvedValueOnce({ tokenSet, scopes: ["studio", "package-manager"] });

        const profile: Profile = {
            name: "test",
            team: "https://example.celonis.cloud",
            apiToken: "",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.CLIENT_CREDENTIALS,
            clientId: "client-id",
            clientSecret: "client-secret",
        };

        await profileService.authorizeProfile(profile);

        expect(tryGrantSpy).toHaveBeenCalled();
        expect(profile.apiToken).toBe("token-123");
        expect(profile.expiresAt).toBe(tokenSet.expires_at);
        expect(profile.scopes).toEqual(["studio", "package-manager"]);
        expect(profile.clientAuthenticationMethod).toBe("client_secret_basic");
    });

    it("should throw when both basic and post client credentials fail", async () => {
        jest.spyOn(profileService as any, "tryClientCredentialsGrant").mockResolvedValue(null);

        const profile: Profile = {
            name: "test",
            team: "https://example.celonis.cloud",
            apiToken: "",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.CLIENT_CREDENTIALS,
            clientId: "client-id",
            clientSecret: "client-secret",
        };

        await expect(profileService.authorizeProfile(profile)).rejects.toThrow(
            "The OAuth client configuration is incorrect"
        );
    });

    it("should use post result when basic fails", async () => {
        const tokenSet = {
            access_token: "token-post",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            scope: "studio",
        };
        jest.spyOn(profileService as any, "tryClientCredentialsGrant")
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ tokenSet, scopes: ["studio"] });

        const profile: Profile = {
            name: "test",
            team: "https://example.celonis.cloud",
            apiToken: "",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.CLIENT_CREDENTIALS,
            clientId: "client-id",
            clientSecret: "client-secret",
        };

        await profileService.authorizeProfile(profile);

        expect(profile.apiToken).toBe("token-post");
        expect(profile.scopes).toEqual(["studio"]);
        expect(profile.clientAuthenticationMethod).toBe("client_secret_post");
    });
});

describe("ProfileService - makeDefaultProfile", () => {
    let profileService: ProfileService;
    const mockHomedir = "/mock/home";
    const mockProfilePath = path.resolve(mockHomedir, ".celonis-content-cli-profiles");
    const configPath = path.resolve(mockProfilePath, "config.json");

    beforeEach(() => {
        (os.homedir as jest.Mock).mockReturnValue(mockHomedir);
        profileService = new ProfileService();
        jest.spyOn(profileService, "findProfile").mockResolvedValue({
            name: "my-profile",
            team: "https://example.celonis.cloud",
            apiToken: "token",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.KEY,
        } as Profile);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should call findProfile and store default profile name in config", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

        await profileService.makeDefaultProfile("my-profile");

        expect(profileService.findProfile).toHaveBeenCalledWith("my-profile");
        expect(fs.writeFileSync).toHaveBeenCalledWith(configPath, JSON.stringify({ defaultProfile: "my-profile" }), { encoding: "utf-8" });
    });

    it("should reject when findProfile fails", async () => {
        jest.spyOn(profileService, "findProfile").mockRejectedValue(new Error("Profile not found"));

        await expect(profileService.makeDefaultProfile("missing")).rejects.toThrow("Profile not found");
    });
});

describe("ProfileService - getDefaultProfile", () => {
    let profileService: ProfileService;
    const mockHomedir = "/mock/home";
    const mockProfilePath = path.resolve(mockHomedir, ".celonis-content-cli-profiles");
    const configPath = path.resolve(mockProfilePath, "config.json");

    beforeEach(() => {
        (os.homedir as jest.Mock).mockReturnValue(mockHomedir);
        profileService = new ProfileService();
    });

    it("should return default profile name when config exists", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ defaultProfile: "my-default" }));

        const result = profileService.getDefaultProfile();

        expect(result).toBe("my-default");
        expect(fs.readFileSync).toHaveBeenCalledWith(configPath, { encoding: "utf-8" });
    });

    it("should return null when config file does not exist", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const result = profileService.getDefaultProfile();

        expect(result).toBeNull();
        expect(fs.readFileSync).not.toHaveBeenCalled();
    });
});

describe("ProfileService - storeProfile", () => {
    let profileService: ProfileService;
    const mockHomedir = "/mock/home";
    const mockProfilePath = path.resolve(mockHomedir, ".celonis-content-cli-profiles");

    beforeEach(() => {
        (os.homedir as jest.Mock).mockReturnValue(mockHomedir);
        profileService = new ProfileService();
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    });

    it("should create profile container if not exists and write profile with normalized team URL", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const profile: Profile = {
            name: "test-profile",
            team: "https://example.celonis.cloud/some/path",
            apiToken: "token",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.KEY,
        };

        profileService.storeProfile(profile);

        expect(fs.mkdirSync).toHaveBeenCalledWith(mockProfilePath);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            path.resolve(mockProfilePath, "test-profile.json"),
            expect.stringContaining("https://example.celonis.cloud"),
            { encoding: "utf-8" }
        );
        expect(profile.team).toBe("https://example.celonis.cloud");
    });

    it("should write profile with correct filename", () => {
        const profile: Profile = {
            name: "my-profile",
            team: "https://team.celonis.cloud",
            apiToken: "token",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.KEY,
        };

        profileService.storeProfile(profile);

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            path.resolve(mockProfilePath, "my-profile.json"),
            expect.any(String),
            { encoding: "utf-8" }
        );
    });
});

describe("ProfileService - readAllProfiles", () => {
    let profileService: ProfileService;

    beforeEach(() => {
        profileService = new ProfileService();
    });

    it("should resolve with list of profile names from getAllFilesInDirectory", async () => {
        const mockNames = ["profile-a", "profile-b"];
        jest.spyOn(profileService, "getAllFilesInDirectory").mockReturnValue(mockNames);

        const result = await profileService.readAllProfiles();

        expect(result).toEqual(mockNames);
        expect(profileService.getAllFilesInDirectory).toHaveBeenCalled();
    });
});

describe("ProfileService - getAllFilesInDirectory", () => {
    let profileService: ProfileService;
    const mockHomedir = "/mock/home";
    const mockProfilePath = path.resolve(mockHomedir, ".celonis-content-cli-profiles");

    beforeEach(() => {
        (os.homedir as jest.Mock).mockReturnValue(mockHomedir);
        profileService = new ProfileService();
    });

    it("should return profile names (without .json) when directory exists", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readdirSync as jest.Mock).mockReturnValue([
            { name: "profile1.json", isDirectory: () => false },
            { name: "profile2.json", isDirectory: () => false },
            { name: "config.json", isDirectory: () => false },
            { name: "subdir", isDirectory: () => true },
        ]);

        const result = profileService.getAllFilesInDirectory();

        expect(result).toEqual(["profile1", "profile2"]);
        expect(fs.readdirSync).toHaveBeenCalledWith(mockProfilePath, { withFileTypes: true });
    });

    it("should return empty array when directory does not exist", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const result = profileService.getAllFilesInDirectory();

        expect(result).toEqual([]);
        expect(fs.readdirSync).not.toHaveBeenCalled();
    });
});

describe("ProfileService - getBaseTeamUrl", () => {
    let profileService: ProfileService;

    beforeEach(() => {
        profileService = new ProfileService();
    });

    it("should return origin for URL with path", () => {
        const result = (profileService as any).getBaseTeamUrl("https://example.celonis.cloud/team/path");
        expect(result).toBe("https://example.celonis.cloud");
    });

    it("should return origin for URL without path", () => {
        const result = (profileService as any).getBaseTeamUrl("https://example.celonis.cloud");
        expect(result).toBe("https://example.celonis.cloud");
    });

    it("should return null for null or undefined input", () => {
        expect((profileService as any).getBaseTeamUrl(null)).toBeNull();
    });
});

describe("ProfileService - isProfileExpired", () => {
    let profileService: ProfileService;

    beforeEach(() => {
        profileService = new ProfileService();
    });

    it("should return false for KEY profile type", () => {
        const profile: Profile = {
            name: "key-profile",
            team: "https://example.com",
            apiToken: "token",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.KEY,
        };
        expect((profileService as any).isProfileExpired(profile)).toBe(false);
    });

    it("should return false when profile has null or undefined type", () => {
        const profile = {
            name: "p",
            team: "https://example.com",
            apiToken: "token",
            authenticationType: AuthenticationType.BEARER,
            type: null,
        } as unknown as Profile;
        expect((profileService as any).isProfileExpired(profile)).toBe(false);
    });

    it("should return true when expiresAt is in the past", () => {
        const profile: Profile = {
            name: "oauth-profile",
            team: "https://example.com",
            apiToken: "token",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.CLIENT_CREDENTIALS,
            expiresAt: Math.floor(Date.now() / 1000) - 3600,
        };
        expect((profileService as any).isProfileExpired(profile)).toBe(true);
    });

    it("should return false when expiresAt is in the future", () => {
        const profile: Profile = {
            name: "oauth-profile",
            team: "https://example.com",
            apiToken: "token",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.CLIENT_CREDENTIALS,
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
        };
        expect((profileService as any).isProfileExpired(profile)).toBe(false);
    });
});

describe("ProfileService - checkIfMissingProfile", () => {
    let profileService: ProfileService;

    beforeEach(() => {
        profileService = new ProfileService();
    });

    it("should return true when profileName is empty string", () => {
        expect((profileService as any).checkIfMissingProfile("")).toBe(true);
    });

    it("should return true when profileName is null or undefined", () => {
        expect((profileService as any).checkIfMissingProfile(null)).toBe(true);
        expect((profileService as any).checkIfMissingProfile(undefined)).toBe(true);
    });

    it("should return undefined when profileName is non-empty", () => {
        expect((profileService as any).checkIfMissingProfile("my-profile")).toBeUndefined();
    });
});

describe("ProfileService - refreshProfile", () => {
    let profileService: ProfileService;

    beforeEach(() => {
        profileService = new ProfileService();
        mockIssuerDiscover.mockResolvedValue({});
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    });

    it("should not refresh when profile is not expired", async () => {
        const profile: Profile = {
            name: "test",
            team: "https://example.com",
            apiToken: "token",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.CLIENT_CREDENTIALS,
            clientId: "id",
            clientSecret: "secret",
            scopes: ["studio"],
            clientAuthenticationMethod: "client_secret_basic",
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
        };
        const storeSpy = jest.spyOn(profileService, "storeProfile").mockImplementation(() => {});

        await profileService.refreshProfile(profile);

        expect(mockIssuerDiscover).not.toHaveBeenCalled();
        expect(storeSpy).not.toHaveBeenCalled();
    });

    it("should refresh client credentials profile and store when expired", async () => {
        const profile: Profile = {
            name: "test",
            team: "https://example.com",
            apiToken: "old-token",
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.CLIENT_CREDENTIALS,
            clientId: "id",
            clientSecret: "secret",
            scopes: ["studio"],
            clientAuthenticationMethod: "client_secret_basic",
            expiresAt: Math.floor(Date.now() / 1000) - 10,
        };
        const newTokenSet = {
            access_token: "new-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
        };
        mockIssuerDiscover.mockResolvedValue({
            Client: jest.fn().mockImplementation(() => ({
                grant: jest.fn().mockResolvedValue(newTokenSet),
            })),
        });
        const storeSpy = jest.spyOn(profileService, "storeProfile").mockImplementation(() => {});

        await profileService.refreshProfile(profile);

        expect(profile.apiToken).toBe("new-token");
        expect(profile.expiresAt).toBe(newTokenSet.expires_at);
        expect(storeSpy).toHaveBeenCalledWith(profile);
    });
});

