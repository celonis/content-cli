import { PackageVersionTransport } from "../../../src/commands/configuration-management/interfaces/package-version.interfaces";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { PackageVersionService } from "../../../src/commands/configuration-management/package-version.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Package Version get", () => {
    const packageVersion: PackageVersionTransport = {
        packageKey: "test-package-key",
        historyId: "history-123",
        version: "1.2.3",
        changeDate: new Date("2024-01-15T10:30:00Z").toISOString(),
        publishDate: new Date("2024-01-15T11:00:00Z").toISOString(),
        publishMessage: "Initial release",
        deployed: true,
        publishedBy: "user@example.com",
    };

    it("Should get package version metadata", async () => {
        const packageKey = "test-package-key";
        const version = "1.2.3";
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/versions/${version}`, packageVersion);

        await new PackageVersionService(testContext).findNode(packageKey, version, false);

        expect(loggingTestTransport.logMessages.length).toBe(8);
        expect(loggingTestTransport.logMessages[0].message).toContain(`Package Key: ${packageVersion.packageKey}`);
        expect(loggingTestTransport.logMessages[1].message).toContain(`Version: ${packageVersion.version}`);
        expect(loggingTestTransport.logMessages[2].message).toContain(`History ID: ${packageVersion.historyId}`);
        expect(loggingTestTransport.logMessages[3].message).toContain(`Change Date: ${new Date(packageVersion.changeDate).toISOString()}`);
        expect(loggingTestTransport.logMessages[4].message).toContain(`Publish Date: ${new Date(packageVersion.publishDate).toISOString()}`);
        expect(loggingTestTransport.logMessages[5].message).toContain(`Publish Message: ${packageVersion.publishMessage}`);
        expect(loggingTestTransport.logMessages[6].message).toContain(`Deployed: ${packageVersion.deployed}`);
        expect(loggingTestTransport.logMessages[7].message).toContain(`Published By: ${packageVersion.publishedBy}`);
    });

    it("Should get package version metadata and return as JSON", async () => {
        const packageKey = "test-package-key";
        const version = "1.2.3";
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/versions/${version}`, packageVersion);

        await new PackageVersionService(testContext).findNode(packageKey, version, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const packageVersionTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as PackageVersionTransport;

        expect(packageVersionTransport).toEqual(packageVersion);
    });

    it("Should handle package version with empty publish message", async () => {
        const packageKey = "test-package";
        const version = "1.0.0";
        const packageVersionWithEmptyMessage: PackageVersionTransport = {
            ...packageVersion,
            packageKey: packageKey,
            version: version,
            publishMessage: "",
        };

        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/versions/${version}`, packageVersionWithEmptyMessage);

        await new PackageVersionService(testContext).findNode(packageKey, version, false);

        expect(loggingTestTransport.logMessages.length).toBe(8);
        expect(loggingTestTransport.logMessages[5].message).toContain("Publish Message: ");
    });
});

