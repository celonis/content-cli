import {
    PackageVersionCreatedTransport,
    VersionBumpOption,
} from "../../../src/commands/configuration-management/interfaces/package-version.interfaces";
import { mockAxiosPost, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { PackageVersionService } from "../../../src/commands/configuration-management/package-version.service";
import {
    PackageVersionCommandService,
} from "../../../src/commands/configuration-management/package-version-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Package Version create", () => {
    const packageKey = "test-package-key";
    const apiUrl = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/versions`;

    const createdVersion: PackageVersionCreatedTransport = {
        packageKey: packageKey,
        version: "1.2.0",
        summaryOfChanges: "Added new analysis views",
        creationDate: new Date("2025-03-19T10:00:00Z").toISOString(),
        createdBy: "user@example.com",
    };

    it("Should create package version with explicit version", async () => {
        mockAxiosPost(apiUrl, createdVersion);

        await new PackageVersionCommandService(testContext).createPackageVersion(
            packageKey, "1.2.0", "NONE", "Added new analysis views", undefined, false,
        );

        expect(loggingTestTransport.logMessages.length).toBe(6);
        expect(loggingTestTransport.logMessages[0].message).toContain(`Successfully created version ${createdVersion.version} for package ${createdVersion.packageKey}`);
        expect(loggingTestTransport.logMessages[1].message).toContain(`Version: ${createdVersion.version}`);
        expect(loggingTestTransport.logMessages[2].message).toContain(`Package Key: ${createdVersion.packageKey}`);
        expect(loggingTestTransport.logMessages[3].message).toContain(`Summary of Changes: ${createdVersion.summaryOfChanges}`);
        expect(loggingTestTransport.logMessages[4].message).toContain(`Creation Date: ${new Date(createdVersion.creationDate).toISOString()}`);
        expect(loggingTestTransport.logMessages[5].message).toContain(`Created By: ${createdVersion.createdBy}`);
    });

    it("Should create package version and return as JSON", async () => {
        mockAxiosPost(apiUrl, createdVersion);

        await new PackageVersionService(testContext).createPackageVersion(
            packageKey, "1.2.0", "NONE", "Added new analysis views", undefined, true,
        );

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const savedTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as PackageVersionCreatedTransport;

        expect(savedTransport).toEqual(createdVersion);
    });

    it("Should create package version with PATCH version bump option", async () => {
        const patchCreated: PackageVersionCreatedTransport = {
            ...createdVersion,
            version: "1.2.1",
        };
        mockAxiosPost(apiUrl, patchCreated);

        await new PackageVersionCommandService(testContext).createPackageVersion(
            packageKey, undefined, "PATCH", "Bug fixes", undefined, false,
        );

        const requestBody = JSON.parse(mockedPostRequestBodyByUrl.get(apiUrl));
        expect(requestBody.versionBumpOption).toBe(VersionBumpOption.PATCH);
        expect(requestBody.version).toBeUndefined();

        expect(loggingTestTransport.logMessages[0].message).toContain(`Successfully created version ${patchCreated.version}`);
    });

    it("Should create package version with node filter keys", async () => {
        mockAxiosPost(apiUrl, createdVersion);

        const nodeKeys = ["node-key-1", "node-key-2"];
        await new PackageVersionCommandService(testContext).createPackageVersion(
            packageKey, "1.2.0", "NONE", "Partial publish", nodeKeys, false,
        );

        const requestBody = JSON.parse(mockedPostRequestBodyByUrl.get(apiUrl));
        expect(requestBody.nodeFilter).toEqual({
            filterType: "INCLUDE",
            keys: nodeKeys,
        });
    });

    it("Should create package version without node filter when keys are omitted", async () => {
        mockAxiosPost(apiUrl, createdVersion);

        await new PackageVersionCommandService(testContext).createPackageVersion(
            packageKey, "1.2.0", "NONE", "Full publish", undefined, false,
        );

        const requestBody = JSON.parse(mockedPostRequestBodyByUrl.get(apiUrl));
        expect(requestBody.nodeFilter).toBeUndefined();
    });

    it("Should handle empty summary of changes", async () => {
        const createdWithEmptySummary: PackageVersionCreatedTransport = {
            ...createdVersion,
            summaryOfChanges: "",
        };
        mockAxiosPost(apiUrl, createdWithEmptySummary);

        await new PackageVersionCommandService(testContext).createPackageVersion(
            packageKey, "1.2.0", "NONE", "", undefined, false,
        );

        expect(loggingTestTransport.logMessages.length).toBe(6);
        expect(loggingTestTransport.logMessages[3].message).toContain("Summary of Changes: ");
    });
});
