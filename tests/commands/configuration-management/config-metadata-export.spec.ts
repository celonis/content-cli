import {mockExistsSync} from "../../utls/fs-mock-utils";
import {mockAxiosGet} from "../../utls/http-requests-mock";
import {PackageMetadataExportTransport} from "../../../src/commands/configuration-management/interfaces/package-export.interfaces";
import {ConfigCommandService} from "../../../src/commands/configuration-management/config-command.service";
import {testContext} from "../../utls/test-context";
import {loggingTestTransport, mockWriteFileSync} from "../../jest.setup";
import {FileService} from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Config metadata export", () => {
    beforeEach(() => {
        mockExistsSync();
    });

    it("Should show on terminal if packages have unpublished changes", async () => {
        const packageKeys: string[] = ["package-key-1", "package-key-2"];

        const response: PackageMetadataExportTransport[] = [
            {key: "package-key-1", hasUnpublishedChanges: true},
            {key: "package-key-2", hasUnpublishedChanges: false},
        ];

        const expectedFirstString: string = "package-key-1 - Has Unpublished Changes: true";
        const expectedSecondString: string = "package-key-2 - Has Unpublished Changes: false";

        mockAxiosGet(
            "https://myTeam.celonis.cloud/package-manager/api/core/packages/metadata/export?packageKeys=package-key-1&packageKeys=package-key-2",
            response
        );

        await new ConfigCommandService(testContext).batchExportPackagesMetadata(packageKeys, false);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain(expectedFirstString);
        expect(loggingTestTransport.logMessages[1].message).toContain(expectedSecondString);
    });

    it("Should create file if packages have unpublished changes and json option is sent as true", async () => {
        const packageKeys: string[] = ["package-key-1", "package-key-2"];

        const response: PackageMetadataExportTransport[] = [
            {key: "package-key-1", hasUnpublishedChanges: true},
            {key: "package-key-2", hasUnpublishedChanges: false},
        ];

        mockAxiosGet(
            "https://myTeam.celonis.cloud/package-manager/api/core/packages/metadata/export?packageKeys=package-key-1&packageKeys=package-key-2",
            response
        );

        await new ConfigCommandService(testContext).batchExportPackagesMetadata(packageKeys, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(
            FileService.fileDownloadedMessage
        )[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            {encoding: "utf-8"}
        );
        const exportedPackagesMetadataTransports = JSON.parse(
            mockWriteFileSync.mock.calls[0][1]
        ) as PackageMetadataExportTransport[];
        expect(exportedPackagesMetadataTransports.length).toBe(2);

        expect(exportedPackagesMetadataTransports).toEqual(response);
    });
});
