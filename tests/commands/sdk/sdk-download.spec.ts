import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Readable } from "stream";
import { mockAxiosGet, mockedAxiosInstance } from "../../utls/http-requests-mock";
import { SdkService } from "../../../src/commands/sdk/sdk.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { rmTempDir } from "../../utls/fs-utils";

describe("SDK download", () => {
    const appId = "app-id";
    const sdkUrl = `https://myTeam.celonis.cloud/pro-code-app-manager/api/npm/@celonis-sdk/${appId}/-/${appId}-latest.tgz`;
    const previousSdkFile = "previous-app-id.tgz";

    let sdkDirectory: string;

    function mockFailedDownload(...body: string[]): void {
        (mockedAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
            status: 404,
            data: Readable.from(body.map(chunk => Buffer.from(chunk))),
        });
    }

    beforeEach(() => {
        sdkDirectory = resolve(process.cwd(), ".celonis-sdk");
        mkdirSync(sdkDirectory, { recursive: true });
        writeFileSync(join(sdkDirectory, previousSdkFile), "previous-sdk");
    });

    afterEach(() => {
        rmTempDir(sdkDirectory);
    });

    it("Should replace the SDK directory with the downloaded SDK", async () => {
        const sdk = Buffer.from("sdk-tarball");
        mockAxiosGet(sdkUrl, sdk);

        await new SdkService(testContext).downloadSdk(appId);

        expect(readFileSync(join(sdkDirectory, `${appId}.tgz`))).toEqual(sdk);
        expect(existsSync(join(sdkDirectory, previousSdkFile))).toBe(false);
        expect(loggingTestTransport.logMessages[0].message).toContain(`SDK downloaded successfully: ${join(".celonis-sdk", `${appId}.tgz`)}`);
    });

    it("Should keep the existing SDK when the download fails", async () => {
        mockFailedDownload("Custom app 'app-id' not found");

        await expect(new SdkService(testContext).downloadSdk(appId))
            .rejects.toThrow(`Problem downloading SDK for app ${appId}: Custom app 'app-id' not found`);

        expect(existsSync(join(sdkDirectory, previousSdkFile))).toBe(true);
    });

    it("Should omit the error details when the failed download has an empty response body", async () => {
        mockFailedDownload();

        await expect(new SdkService(testContext).downloadSdk(appId))
            .rejects.toThrow(new RegExp(`^Problem downloading SDK for app ${appId}$`));
    });
});
