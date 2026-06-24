import { PacmanApiUtils } from "../../utls/pacman-api.utils";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { T2tcCommandService } from "../../../src/commands/t2tc/t2tc-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import {
    ContentNodeTransport,
    PackageWithVariableAssignments, StudioComputeNodeDescriptor,
} from "../../../src/commands/studio/interfaces/package-manager.interfaces";
import {
    PackageExportTransport
} from "../../../src/commands/configuration-management/interfaces/package-export.interfaces";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

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
            urlParams.set("includeBranches", "false");
            flavorsArray.forEach(flavor => urlParams.append("flavors", flavor));

            mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list?" + urlParams.toString(), [firstPackage, secondPackage]);

            await new T2tcCommandService(testContext).listPackages(false, flavorsArray, false, [], undefined, null, null, false, false);

            expect(loggingTestTransport.logMessages.length).toBe(2);
            expect(loggingTestTransport.logMessages[0].message).toContain(`${firstPackage.name} - Key: "${firstPackage.key}"`);
            expect(loggingTestTransport.logMessages[1].message).toContain(`${secondPackage.name} - Key: "${secondPackage.key}"`);
        }
    )

    it("Should export all packages for json response with spaceId set for studio packages", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

        const studioPackage: ContentNodeTransport = PacmanApiUtils.buildContentNodeTransport("key-1", "spaceId-1");

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list?withDependencies=false&includeBranches=false", [{...firstPackage}, {...secondPackage}]);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", [studioPackage]);

        await new T2tcCommandService(testContext).listPackages(true, [], false, [], undefined, null, null, false, false);

        const exportedTransports = getJsonFromDownloadedFile() as PackageExportTransport[];
        expect(exportedTransports.length).toBe(2);

        const exportedFirstPackage = exportedTransports.filter(transport => transport.key === firstPackage.key)[0];
        const exportedSecondPackage = exportedTransports.filter(transport => transport.key === secondPackage.key)[0];

        expect(exportedSecondPackage).toEqual(secondPackage);
        expect(exportedFirstPackage).toEqual({...firstPackage, spaceId: "spaceId-1"});
    })

    it("Should export all packages with dependencies and data models set for json response and withDependencies option", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list?withDependencies=true&includeBranches=false", [{...firstPackage}, {...secondPackage}]);
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

        await new T2tcCommandService(testContext).listPackages(true, [], true, [], undefined, null, null, false, false);

        const exportedTransports = getJsonFromDownloadedFile() as PackageExportTransport[];
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

        await new T2tcCommandService(testContext).listPackages(true, [], false, [firstPackage.key, secondPackage.key], undefined, null, null, false, false);

        const exportedTransports = getJsonFromDownloadedFile() as PackageExportTransport[];
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

        await new T2tcCommandService(testContext).listPackages(true, [], true, [firstPackage.key, secondPackage.key], undefined, null, null, false, false);

        const exportedTransports = getJsonFromDownloadedFile() as PackageExportTransport[];
        expect(exportedTransports.length).toBe(2);

        const exportedFirstPackage = exportedTransports.filter(transport => transport.key === firstPackage.key)[0];
        const exportedSecondPackage = exportedTransports.filter(transport => transport.key === secondPackage.key)[0];

        expect(exportedSecondPackage).toEqual(secondPackage);
        expect(exportedFirstPackage).toEqual({...firstPackage, datamodels: [{...dataModelDetailResponse}]});
    })

    it("Should list all packages filtered by variable value", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");


        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list-by-variable-value?variableValue=1&includeBranches=false", [{...firstPackage}, {...secondPackage}]);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", []);

        await new T2tcCommandService(testContext).listPackages(false, [], false, [], undefined, "1", null, false, false);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain(`${firstPackage.name} - Key: "${firstPackage.key}"`);
        expect(loggingTestTransport.logMessages[1].message).toContain(`${secondPackage.name} - Key: "${secondPackage.key}"`);
    })

    it("Should export all packages for json response filtered by variable value", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("key-1", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("key-2", "name-2");

        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/core/packages/export/list-by-variable-value?variableValue=1&includeBranches=false", [{...firstPackage}, {...secondPackage}]);
        mockAxiosGet("https://myTeam.celonis.cloud/package-manager/api/packages/with-variable-assignments?type=DATA_MODEL", []);

        await new T2tcCommandService(testContext).listPackages(true, [], false, [], undefined, "1", null, false, false);

        const exportedTransports = getJsonFromDownloadedFile() as PackageExportTransport[];
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

        await new T2tcCommandService(testContext).listPackages(false, [], false, undefined, keysByVersion, null, null, false, false);

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

        await new T2tcCommandService(testContext).listPackages(false, [], true, undefined, keysByVersion, null, null, false, false);

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

        await new T2tcCommandService(testContext).listPackages(true, [], false, [], keysByVersion, null, null, false, false);

        const exportedTransports = getJsonFromDownloadedFile() as PackageExportTransport[];
        expect(exportedTransports.length).toBe(2);

        const exportedFirstPackage = exportedTransports.filter(transport => transport.key === firstPackage.key)[0];
        const exportedSecondPackage = exportedTransports.filter(transport => transport.key === secondPackage.key)[0];

        expect(exportedSecondPackage).toEqual(secondPackage);
        expect(exportedFirstPackage).toEqual({...firstPackage, spaceId: "spaceId-1"});
    })

    it("Should list all staging packages by key for non-json response with flavors", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("studio", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("ocdm", "name-2");

        const urlParams = new URLSearchParams();
        urlParams.set("includeBranches", "false");
        urlParams.append("flavors", "STUDIO");

        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/staging/packages/export/list?" + urlParams.toString(), [firstPackage, secondPackage]);

        await new T2tcCommandService(testContext).listPackages(false, ["STUDIO"], false, [], undefined, null, null, false, true);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain(`${firstPackage.name} - Key: "${firstPackage.key}"`);
        expect(loggingTestTransport.logMessages[1].message).toContain(`${secondPackage.name} - Key: "${secondPackage.key}"`);
    })

    it("Should list all staging packages by key for non-json response without flavors", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("studio", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("ocdm", "name-2");

        const urlParams = new URLSearchParams();
        urlParams.set("includeBranches", "false");

        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/staging/packages/export/list?" + urlParams.toString(), [firstPackage, secondPackage]);

        await new T2tcCommandService(testContext).listPackages(false, null, false, [], undefined, null, null, false, true);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain(`${firstPackage.name} - Key: "${firstPackage.key}"`);
        expect(loggingTestTransport.logMessages[1].message).toContain(`${secondPackage.name} - Key: "${secondPackage.key}"`);
    })

    it("Should list all staging packages by key for json response with flavors", async () => {
        const firstPackage = PacmanApiUtils.buildPackageExportTransport("studio", "name-1");
        const secondPackage = PacmanApiUtils.buildPackageExportTransport("ocdm", "name-2");

        const urlParams = new URLSearchParams();
        urlParams.set("includeBranches", "false");
        urlParams.append("flavors", "STUDIO");

        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/core/staging/packages/export/list?" + urlParams.toString(), [firstPackage, secondPackage]);

        await new T2tcCommandService(testContext).listPackages(true, ["STUDIO"], false, [], undefined, null, null, false, true);

        const exportedTransports = getJsonFromDownloadedFile() as PackageExportTransport[];
        expect(exportedTransports.length).toBe(2);

        const exportedFirstPackage = exportedTransports.find(transport => transport.key === firstPackage.key);
        const exportedSecondPackage = exportedTransports.find(transport => transport.key === secondPackage.key);

        expect(exportedSecondPackage).toEqual(secondPackage);
        expect(exportedFirstPackage).toEqual(firstPackage);

    })
})