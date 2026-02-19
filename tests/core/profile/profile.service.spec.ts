import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {ProfileValidator} from "../../../src/core/profile/profile.validator";
import {Profile, ProfileType, AuthenticationType} from "../../../src/core/profile/profile.interface";

jest.mock("os", () => ({
    homedir: jest.fn(() => "/mock/home"),
}));

import {ProfileService} from "../../../src/core/profile/profile.service";

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
                type: ProfileType.KEY,
            };

            const profileFilePath = path.resolve(mockProfilePath, `${profileName}.json`);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockProfile));

            process.env.TEAM_URL = "https://env.celonis.cloud";
            process.env.API_TOKEN = "env-token";

            jest.spyOn(profileService, "refreshProfile").mockResolvedValue(undefined);

            const result = await profileService.findProfile(profileName);

            expect(fs.readFileSync).toHaveBeenCalledWith(profileFilePath, {
                encoding: "utf-8",
            });
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
                type: ProfileType.KEY,
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
                type: ProfileType.KEY,
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
            expect(fs.readFileSync).toHaveBeenCalledWith(profileFilePath, {
                encoding: "utf-8",
            });
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
