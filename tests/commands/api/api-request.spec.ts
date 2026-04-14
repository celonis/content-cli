import { mockAxiosGet, mockAxiosPost, mockAxiosPut } from "../../utls/http-requests-mock";
import { ApiService } from "../../../src/commands/api/api.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Api request command", () => {
    const sampleResponse = { packages: [{ id: "pkg-1", name: "My Package" }] };

    it("Should execute a GET request and print the response", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/v2/packages", sampleResponse);

        await new ApiService(testContext).request("/package-manager/api/v2/packages", "GET", undefined, false);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain("GET /package-manager/api/v2/packages");
        expect(loggingTestTransport.logMessages[1].message).toContain("pkg-1");
    });

    it("Should execute a GET request and save response as JSON file", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/v2/packages", sampleResponse);

        await new ApiService(testContext).request("/package-manager/api/v2/packages", "GET", undefined, true);

        const expectedFileName = loggingTestTransport.logMessages[1].message.split(FileService.fileDownloadedMessage)[1];
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            { encoding: "utf-8" }
        );

        const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
        expect(written.packages[0].id).toBe("pkg-1");
    });

    it("Should execute a POST request with body", async () => {
        const postBody = { name: "New Package" };
        mockAxiosPost("https://myTeam.celonis.cloud/package-manager/api/v2/packages", { id: "pkg-2" });

        await new ApiService(testContext).request(
            "/package-manager/api/v2/packages", "POST", JSON.stringify(postBody), false
        );

        expect(loggingTestTransport.logMessages[0].message).toContain("POST /package-manager/api/v2/packages");
        expect(loggingTestTransport.logMessages[1].message).toContain("pkg-2");
    });

    it("Should execute a PUT request with body", async () => {
        const putBody = { name: "Updated Package" };
        mockAxiosPut("https://myTeam.celonis.cloud/package-manager/api/v2/packages/pkg-1", { id: "pkg-1", name: "Updated Package" });

        await new ApiService(testContext).request(
            "/package-manager/api/v2/packages/pkg-1", "PUT", JSON.stringify(putBody), false
        );

        expect(loggingTestTransport.logMessages[0].message).toContain("PUT /package-manager/api/v2/packages/pkg-1");
        expect(loggingTestTransport.logMessages[1].message).toContain("Updated Package");
    });

    it("Should reject paths that don't start with /", async () => {
        await expect(
            new ApiService(testContext).request("package-manager/api/v2/packages", "GET", undefined, false)
        ).rejects.toThrow("Path must start with /");
    });

    it("Should reject invalid HTTP methods", async () => {
        await expect(
            new ApiService(testContext).request("/some/path", "PATCH", undefined, false)
        ).rejects.toThrow("Invalid method");
    });

    it("Should reject invalid JSON body", async () => {
        await expect(
            new ApiService(testContext).request("/some/path", "POST", "not-json{", false)
        ).rejects.toThrow("--body must be valid JSON");
    });

    it("Should be case-insensitive on method (normalized to upper by module)", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/some/path", { ok: true });

        await new ApiService(testContext).request("/some/path", "GET", undefined, false);

        expect(loggingTestTransport.logMessages[0].message).toContain("GET /some/path");
    });
});
