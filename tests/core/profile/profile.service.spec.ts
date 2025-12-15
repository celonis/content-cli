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
        it("should return early and not modify environment variables", () => {
            delete process.env.CELONIS_URL;
            delete process.env.TEAM_URL;
            delete process.env.API_TOKEN;

            (profileService as any).mapCelonisEnvProfile();

            expect(process.env.TEAM_URL).toBeUndefined();
            expect(process.env.API_TOKEN).toBeUndefined();
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

