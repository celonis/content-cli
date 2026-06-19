import { mockAxiosGet } from "../../utls/http-requests-mock";
import {
    PackageMetadataExportTransport
} from "../../../src/commands/configuration-management/interfaces/package-export.interfaces";
import { MetadataService } from "../../../src/commands/configuration-management/metadata.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

describe("Config metadata export", () => {
    it("Should show on terminal if packages have unpublished changes", async () => {
        const packageKeys: string[] = ["package-key-1", "package-key-2"];

        const response: PackageMetadataExportTransport[] = [
            { key: "package-key-1", hasUnpublishedChanges: true },
            { key: "package-key-2", hasUnpublishedChanges: false }
        ]

        const expectedFirstString: string = "package-key-1 - Has Unpublished Changes: true";
        const expectedSecondString: string = "package-key-2 - Has Unpublished Changes: false";

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/metadata/export?packageKeys=package-key-1&packageKeys=package-key-2", response);

        await new MetadataService(testContext).exportPackagesMetadata(packageKeys, false);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            expectedFirstString
        );
        expect(loggingTestTransport.logMessages[1].message).toContain(
            expectedSecondString
        );
    });

    it("Should create file if packages have unpublished changes and json option is sent as true", async () => {
        const packageKeys: string[] = ["package-key-1", "package-key-2"];

        const response: PackageMetadataExportTransport[] = [
            { key: "package-key-1", hasUnpublishedChanges: true },
            { key: "package-key-2", hasUnpublishedChanges: false }
        ]

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/metadata/export?packageKeys=package-key-1&packageKeys=package-key-2", response);

        await new MetadataService(testContext).exportPackagesMetadata(packageKeys, true);

        const exportedPackagesMetadataTransports = getJsonFromDownloadedFile() as PackageMetadataExportTransport[];
        expect(exportedPackagesMetadataTransports.length).toBe(2);

        expect(exportedPackagesMetadataTransports).toEqual(response);
    });

});