import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import AdmZip = require("adm-zip");
import {
    mockAxiosPost,
    mockAxiosPostError,
    mockedAxiosInstance,
    mockedPostRequestBodyByUrl,
} from "../../utls/http-requests-mock";
import { SdkService } from "../../../src/commands/sdk/sdk.service";
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
        mockAxiosPost(publishUrl, { version: "release-1" });

        await new SdkService(testContext).publishApp(appId, distDirectory);

        expect(publishedBundle().readAsText("index.html")).toBe("<html></html>");
        expect(publishedBundle().readAsText("assets/main.js")).toBe("console.log()");
        expect(loggingTestTransport.logMessages[0].message).toContain("App published successfully. Version: release-1");
    });

    it("Should upload the bundle as zip archive", async () => {
        mockAxiosPost(publishUrl, { version: "release-1" });

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
});
