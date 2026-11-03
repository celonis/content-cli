import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import AdmZip = require("adm-zip");
import axios from "axios";
import {
    mockAxiosPost,
    mockAxiosPostError,
    mockedAxiosInstance,
    mockedPostRequestBodyByUrl,
} from "../../utls/http-requests-mock";
import { SdkService } from "../../../src/commands/sdk/sdk.service";
import { SdkApi } from "../../../src/commands/sdk/sdk-api";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { makeTempDir, rmTempDir, uniqueDirName } from "../../utls/fs-utils";

describe("SDK publish", () => {
    const appId = "app-id";
    const publishUrl = `https://myTeam.celonis.cloud/pro-code-app-manager/api/codespace/apps/${appId}/publish`;

    let distDirectory: string;

    function publishedBundle(): AdmZip {
        return new AdmZip(mockedPostRequestBodyByUrl.get(publishUrl));
    }

    function sentParams(): Record<string, string | undefined> {
        return (mockedAxiosInstance.post as jest.Mock).mock.calls[0][2].params;
    }

    function sentUri(): string {
        return axios.getUri({ url: publishUrl, params: sentParams() });
    }

    beforeEach(() => {
        distDirectory = makeTempDir();
        mkdirSync(join(distDirectory, "assets"));
        writeFileSync(join(distDirectory, "index.html"), "<html></html>");
        writeFileSync(join(distDirectory, "assets", "main.js"), "console.log()");
    });

    afterEach(() => {
        rmTempDir(distDirectory);
    });

    it("Should upload the compressed dist directory and print the assigned version", async () => {
        mockAxiosPost(publishUrl, { version: "1.0.0" });

        await new SdkService(testContext).publishApp(appId, distDirectory);

        expect(publishedBundle().readAsText("index.html")).toBe("<html></html>");
        expect(publishedBundle().readAsText("assets/main.js")).toBe("console.log()");
        expect(loggingTestTransport.logMessages[0].message).toContain("App published successfully as version '1.0.0'");
    });

    it("Should upload the bundle as zip archive", async () => {
        mockAxiosPost(publishUrl, { version: "1.0.0" });

        await new SdkService(testContext).publishApp(appId, distDirectory);

        const requestConfig = (mockedAxiosInstance.post as jest.Mock).mock.calls[0][2];
        expect(requestConfig.headers["Content-Type"]).toBe("application/zip");
    });

    it("Should reject a dist directory that does not exist without uploading", async () => {
        const missingDirectory = join(distDirectory, uniqueDirName());

        await expect(new SdkService(testContext).publishApp(appId, missingDirectory))
            .rejects.toThrow(`The dist directory ${missingDirectory} does not exist or is no directory`);

        expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
    });

    it("Should reject a dist path that is a file without uploading", async () => {
        const file = join(distDirectory, "index.html");

        await expect(new SdkService(testContext).publishApp(appId, file))
            .rejects.toThrow(`The dist directory ${file} does not exist or is no directory`);

        expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
    });

    it("Should report the backend error when publishing fails", async () => {
        mockAxiosPostError(publishUrl, 404, "Custom app 'app-id' not found");

        await expect(new SdkService(testContext).publishApp(appId, distDirectory))
            .rejects.toThrow(`Problem publishing app ${appId}: Error: "Custom app 'app-id' not found"`);
    });

    it("Should publish with the given version and message", async () => {
        mockAxiosPost(publishUrl, { version: "2.0.0" });

        await new SdkService(testContext).publishApp(appId, distDirectory, "2.0.0", "First build");

        expect(publishedBundle().readAsText("index.html")).toBe("<html></html>");
        expect(sentParams()).toEqual({ version: "2.0.0", message: "First build" });
        expect(loggingTestTransport.logMessages[0].message).toContain("App published successfully as version '2.0.0'");
    });

    describe("Publish request", () => {
        const bundle = Buffer.from("bundle");

        it("Should send version and message as URL-encoded query parameters", async () => {
            mockAxiosPost(publishUrl, { version: "2.0.0" });

            const response = await new SdkApi(testContext).publishApp(appId, bundle, { version: "2.0.0", message: "Fix: #12 / a & b? x=1+2 🚀" });

            expect(response.version).toBe("2.0.0");
            expect(mockedPostRequestBodyByUrl.get(publishUrl)).toBe(bundle);
            expect(sentUri()).toBe(`${publishUrl}?version=2.0.0&message=Fix:+%2312+%2F+a+%26+b%3F+x%3D1%2B2+%F0%9F%9A%80`);
        });

        it("Should send only the version when no message is given", async () => {
            mockAxiosPost(publishUrl, { version: "2.0.0" });

            await new SdkApi(testContext).publishApp(appId, bundle, { version: "2.0.0" });

            expect(sentUri()).toBe(`${publishUrl}?version=2.0.0`);
        });

        it("Should send only the message when no version is given", async () => {
            mockAxiosPost(publishUrl, { version: "1.0.0" });

            await new SdkApi(testContext).publishApp(appId, bundle, { message: "First build" });

            expect(sentUri()).toBe(`${publishUrl}?message=First+build`);
        });

        it("Should report a version conflict from the backend", async () => {
            mockAxiosPostError(publishUrl, 409, "Version 1.0.0 must be greater than the latest version 2.0.0");

            await expect(new SdkApi(testContext).publishApp(appId, bundle, { version: "1.0.0" }))
                .rejects.toThrow(`Problem publishing app ${appId}: Error: "Version 1.0.0 must be greater than the latest version 2.0.0"`);
        });
    });
});
