import { PackageVersionTransport } from "../../../src/commands/configuration-management/interfaces/package-version.interfaces";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import {
    PackageVersionCommandService
} from "../../../src/commands/configuration-management/package-version-command.service";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

describe("Package Version list", () => {
    const buildPackageVersion = (packageKey: string, version: string, deployed: boolean): PackageVersionTransport => ({
        packageKey,
        historyId: `history-${version}`,
        version,
        changeDate: new Date("2024-01-15T10:30:00Z").toISOString(),
        publishDate: new Date("2024-01-15T11:00:00Z").toISOString(),
        publishMessage: `Release ${version}`,
        deployed,
        publishedBy: "user@example.com",
    });

    it("Should list package versions", async () => {
        const packageKey = "test-package-key";
        const packageVersions = [
            buildPackageVersion(packageKey, "1.0.1", true),
            buildPackageVersion(packageKey, "1.0.0", false),
        ];
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/versions`, packageVersions);

        await new PackageVersionCommandService(testContext).listPackageVersions(packageKey, false);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(JSON.parse(loggingTestTransport.logMessages[0].message)).toEqual(packageVersions[0]);
        expect(JSON.parse(loggingTestTransport.logMessages[1].message)).toEqual(packageVersions[1]);
    });

    it("Should list branch versions and return them as JSON", async () => {
        const branchPackageKey = "project-key@my-branch";
        const packageVersions = [buildPackageVersion(branchPackageKey, "0.0.2", false)];
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/packages/${branchPackageKey}/versions`, packageVersions);

        await new PackageVersionCommandService(testContext).listPackageVersions(branchPackageKey, true);

        expect(getJsonFromDownloadedFile()).toEqual(packageVersions);
    });

    it("Should report a package without versions", async () => {
        const packageKey = "unpublished-package";
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/versions`, []);

        await new PackageVersionCommandService(testContext).listPackageVersions(packageKey, false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(`Package ${packageKey} has no versions.`);
    });
});
