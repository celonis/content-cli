import { Context } from "../../../src/core/command/cli-context";
import { HttpClient } from "../../../src/core/http/http-client";
import { Profile } from "../../../src/core/profile/profile.interface";
import { mockAxiosGet, mockAxiosPost, mockAxiosPostError, mockedAxiosInstance } from "../../utls/http-requests-mock";

const TEAM_URL = "https://myTeam.celonis.cloud";
const RESOURCE_PATH = "/api/test/resource";

function httpClientFor(profile: Partial<Profile>): HttpClient {
    const context = new Context({});
    context.profile = {
        name: "test",
        team: TEAM_URL,
        type: "Key",
        authenticationType: "Bearer",
        ...profile,
    } as Profile;
    return new HttpClient(context);
}

function headersOfSentRequest(): any {
    return (mockedAxiosInstance.get as jest.Mock).mock.calls[0][1].headers;
}

describe("HttpClient authorization headers", () => {

    beforeEach(() => {
        mockAxiosGet(TEAM_URL + RESOURCE_PATH, {});
    });

    it("should send an authorization header when the profile has a token", async () => {
        await httpClientFor({ apiToken: "test-token" }).get(RESOURCE_PATH);

        expect(headersOfSentRequest().Authorization).toBe("Bearer test-token");
    });

    it("should use the authentication type of the profile", async () => {
        await httpClientFor({ apiToken: "test-token", authenticationType: "AppKey" }).get(RESOURCE_PATH);

        expect(headersOfSentRequest().Authorization).toBe("AppKey test-token");
    });

    it("should fall back to Bearer when the profile has no authentication type", async () => {
        await httpClientFor({ apiToken: "test-token", authenticationType: undefined }).get(RESOURCE_PATH);

        expect(headersOfSentRequest().Authorization).toBe("Bearer test-token");
    });

    it("should omit the authorization header when the profile has no token", async () => {
        await httpClientFor({ apiToken: undefined }).get(RESOURCE_PATH);

        expect(headersOfSentRequest()).not.toHaveProperty("Authorization");
    });

    it("should omit the authorization header when the profile token is empty", async () => {
        await httpClientFor({ apiToken: "" }).get(RESOURCE_PATH);

        expect(headersOfSentRequest()).not.toHaveProperty("Authorization");
    });

    it("should still send the content type when the profile has no token", async () => {
        await httpClientFor({ apiToken: undefined }).get(RESOURCE_PATH);

        expect(headersOfSentRequest()["Content-Type"]).toBe("application/json");
    });
});

describe("HttpClient binary post", () => {
    const body = Buffer.from("binary-content");

    it("should send the body unchanged with the given content type", async () => {
        mockAxiosPost(TEAM_URL + RESOURCE_PATH, { result: "ok" });

        const response = await httpClientFor({ apiToken: "test-token" }).postBinary(RESOURCE_PATH, body, "application/zip");

        const [, sentBody, config] = (mockedAxiosInstance.post as jest.Mock).mock.calls[0];
        expect(response).toEqual({ result: "ok" });
        expect(sentBody).toBe(body);
        expect(config.headers["Content-Type"]).toBe("application/zip");
    });

    it("should reject with the response body when the backend responds with an error", async () => {
        mockAxiosPostError(TEAM_URL + RESOURCE_PATH, 400, "Invalid bundle");

        await expect(httpClientFor({ apiToken: "test-token" }).postBinary(RESOURCE_PATH, body, "application/zip"))
            .rejects.toThrow("\"Invalid bundle\"");
    });
});
