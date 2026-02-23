import * as path from "path";
import { PacmanApiUtils } from "../../utls/pacman-api.utils";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { ConfigCommandService } from "../../../src/commands/configuration-management/config-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import {
    ContentNodeTransport,
    PackageWithVariableAssignments, StudioComputeNodeDescriptor,
} from "../../../src/commands/studio/interfaces/package-manager.interfaces";
import { FileService } from "../../../src/core/utils/file-service";
import {
    PackageExportTransport
} from "../../../src/commands/configuration-management/interfaces/package-export.interfaces";

describe("Config list", () => {

    it.each([
        "",
        "STUDIO,TEST"
    ])(
        "Should list all packages by key for non-json response with flavors: %p",
        async (flavors: string) => {
            const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
            const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

            const flavorsArray = flavors !== "" ? flavors.split(",") : [];

            const urlParams = new URLSearchParams();
            urlParams.set("withDependencies", "false");
            flavorsArray.forEach(flavor => urlParams.append("flavors", flavor));

            mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list?" + urlParams.toString(), [firstPackage, secondPackage]);

            await new ConfigCommandService(testContext).listActivePackages(false, flavorsArray, false, [], undefined, null, null);

            expect(loggingTestTransport.logMessages.length).toBe(2);
            expect(loggingTestTransport.logMessages[0].message).toContain(`${firstPackage.name} - Key: "${firstPackage.key}"`);
            expect(loggingTestTransport.logMessages[1].message).toContain(`${secondPackage.name} - Key: "${secondPackage.key}"`);
        }
    )

    it("Should export all packages for json response with spaceId set for studio packages", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

        const studioPackage: ContentNodeTransport = PacmanApiUtils.buildContentNodeTransport("key-1", "spaceId-1");

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list?withDependencies=false", [{...firstPackage}, {...secondPackage}]);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", [studioPackage]);

        await new ConfigCommandService(testContext).listActivePackages(true, [], false, [], undefined, null, null);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const exportedTransports = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as PackageExportTransport[];
        expect(exportedTransports.length).toBe(2);

        const exportedFirstPackage = exportedTransports.filter(transport => transport.key === firstPackage.key)[0];
        const exportedSecondPackage = exportedTransports.filter(transport => transport.key === secondPackage.key)[0];

        expect(exportedSecondPackage).toEqual(secondPackage);
        expect(exportedFirstPackage).toEqual({...firstPackage, spaceId: "spaceId-1"});
    })

    it("Should export all packages with dependencies and data models set for json response and withDependencies option", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list?withDependencies=true", [{...firstPackage}, {...secondPackage}]);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", []);

        const dataModelVariableAssignmentResponse: PackageWithVariableAssignments = {
            id: "var-id",
            key: firstPackage.key,
            name: "var-name",
            createdBy: "",
            spaceId: undefined,
            variableAssignments: [
                {
                    key: "var-key",
                    value: "datamodel-id" as unknown as object,
                    type: "DATA_MODEL"
                }
            ]
        };
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", [dataModelVariableAssignmentResponse]);

        const dataModelDetailResponse: StudioComputeNodeDescriptor = {
            name: "pool-name",
            dataModelId: "datamodel-id",
            poolId: "pool-id"
        };
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/compute-pools/data-models/details", [dataModelDetailResponse]);

        await new ConfigCommandService(testContext).listActivePackages(true, [], true, [], undefined, null, null);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const exportedTransports = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as PackageExportTransport[];
        expect(exportedTransports.length).toBe(2);

        const exportedFirstPackage = exportedTransports.filter(transport => transport.key === firstPackage.key)[0];
        const exportedSecondPackage = exportedTransports.filter(transport => transport.key === secondPackage.key)[0];

        expect(exportedSecondPackage).toEqual(secondPackage);
        expect(exportedFirstPackage).toEqual({...firstPackage, datamodels: [{...dataModelDetailResponse}]});
    })

    it("Should export packagesByKeys with spaceId set for studio packages", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

        const studioPackage: ContentNodeTransport = PacmanApiUtils.buildContentNodeTransport("key-1", "spaceId-1");

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list-by-keys?packageKeys=key-1&packageKeys=key-2&withDependencies=false", [{...firstPackage}, {...secondPackage}]);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", [studioPackage]);

        await new ConfigCommandService(testContext).listActivePackages(true, [], false, [firstPackage.key, secondPackage.key], undefined, null, null);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const exportedTransports = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as PackageExportTransport[];
        expect(exportedTransports.length).toBe(2);

        const exportedFirstPackage = exportedTransports.filter(transport => transport.key === firstPackage.key)[0];
        const exportedSecondPackage = exportedTransports.filter(transport => transport.key === secondPackage.key)[0];

        expect(exportedSecondPackage).toEqual(secondPackage);
        expect(exportedFirstPackage).toEqual({...firstPackage, spaceId: "spaceId-1"});
    })

    it("Should export packagesByKeys with dependencies and data models set for withDependencies option", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list-by-keys?packageKeys=key-1&packageKeys=key-2&withDependencies=true", [{...firstPackage}, {...secondPackage}]);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", []);

        const dataModelVariableAssignmentResponse: PackageWithVariableAssignments = {
            id: "var-id",
            key: firstPackage.key,
            name: "var-name",
            createdBy: "",
            spaceId: undefined,
            variableAssignments: [
                {
                    key: "var-key",
                    value: "datamodel-id" as unknown as object,
                    type: "DATA_MODEL"
                }
            ]
        };
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", [dataModelVariableAssignmentResponse]);

        const dataModelDetailResponse: StudioComputeNodeDescriptor = {
            name: "pool-name",
            dataModelId: "datamodel-id",
            poolId: "pool-id"
        };
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/compute-pools/data-models/details", [dataModelDetailResponse]);

        await new ConfigCommandService(testContext).listActivePackages(true, [], true, [firstPackage.key, secondPackage.key], undefined, null, null);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const exportedTransports = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as PackageExportTransport[];
        expect(exportedTransports.length).toBe(2);

        const exportedFirstPackage = exportedTransports.filter(transport => transport.key === firstPackage.key)[0];
        const exportedSecondPackage = exportedTransports.filter(transport => transport.key === secondPackage.key)[0];

        expect(exportedSecondPackage).toEqual(secondPackage);
        expect(exportedFirstPackage).toEqual({...firstPackage, datamodels: [{...dataModelDetailResponse}]});
    })

    it("Should list all packages filtered by variable value", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");


        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list-by-variable-value?variableValue=1", [{...firstPackage}, {...secondPackage}]);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", []);

        await new ConfigCommandService(testContext).listActivePackages(false, [], false, [], undefined, "1", null);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain(`${firstPackage.name} - Key: "${firstPackage.key}"`);
        expect(loggingTestTransport.logMessages[1].message).toContain(`${secondPackage.name} - Key: "${secondPackage.key}"`);
    })

    it("Should export all packages for json response filtered by variable value", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list-by-variable-value?variableValue=1", [{...firstPackage}, {...secondPackage}]);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", []);

        await new ConfigCommandService(testContext).listActivePackages(true, [], false, [], undefined, "1", null);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const exportedTransports = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as PackageExportTransport[];
        expect(exportedTransports.length).toBe(2);
    })

    it("Should list packages by keysByVersion for non-json response", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

        const keysByVersion = ["key-1.1.0.0", "key-2.1.0.1"];
        mockAxiosGet(
            "https://myTeam.celonis.cloud/package-manager/api/core/packages/versions/export/list?packageKeysWithVersion=key-1.1.0.0&packageKeysWithVersion=key-2.1.0.1&withDependencies=false",
            [firstPackage, secondPackage]
        );

        await new ConfigCommandService(testContext).listActivePackages(false, [], false, undefined, keysByVersion, null, null);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain(`${firstPackage.name} - Key: "${firstPackage.key}"`);
        expect(loggingTestTransport.logMessages[1].message).toContain(`${secondPackage.name} - Key: "${secondPackage.key}"`);
    })

    it("Should list packages by keysByVersion with withDependencies for non-json response", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

        const keysByVersion = ["key-1.1.0.0", "key-2.1.0.1"];
        mockAxiosGet(
            "https://myTeam.celonis.cloud/package-manager/api/core/packages/versions/export/list?packageKeysWithVersion=key-1.1.0.0&packageKeysWithVersion=key-2.1.0.1&withDependencies=true",
            [firstPackage, secondPackage]
        );

        await new ConfigCommandService(testContext).listActivePackages(false, [], true, undefined, keysByVersion, null, null);

        expect(loggingTestTransport.logMessages.length).toBe(2);
    })

    it("Should list packages by keysByVersion for json response", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

        const studioPackage: ContentNodeTransport = PacmanApiUtils.buildContentNodeTransport("key-1", "spaceId-1");
        const keysByVersion = ["key-1.1.0.0", "key-2.1.0.1"];

        mockAxiosGet(
            "https://myTeam.celonis.cloud/package-manager/api/core/packages/versions/export/list?packageKeysWithVersion=key-1.1.0.0&packageKeysWithVersion=key-2.1.0.1&withDependencies=false",
            [{...firstPackage}, {...secondPackage}]
        );
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", [studioPackage]);

        await new ConfigCommandService(testContext).listActivePackages(true, [], false, [], keysByVersion, null, null);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const exportedTransports = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as PackageExportTransport[];
        expect(exportedTransports.length).toBe(2);

        const exportedFirstPackage = exportedTransports.filter(transport => transport.key === firstPackage.key)[0];
        const exportedSecondPackage = exportedTransports.filter(transport => transport.key === secondPackage.key)[0];

        expect(exportedSecondPackage).toEqual(secondPackage);
        expect(exportedFirstPackage).toEqual({...firstPackage, spaceId: "spaceId-1"});
    })
})