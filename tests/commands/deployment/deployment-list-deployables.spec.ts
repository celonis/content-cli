import {DeployableTransport} from "../../../src/commands/deployment/deployment.interfaces";
import {mockAxiosGet} from "../../utls/http-requests-mock";
import {DeploymentService} from "../../../src/commands/deployment/deployment.service";
import {testContext} from "../../utls/test-context";
import {loggingTestTransport, mockWriteFileSync} from "../../jest.setup";
import {FileService} from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Deployment list deployables", () => {
    const appPackage: DeployableTransport = {
        name: "App package",
        type: "app-package",
        targetType: "apps-portal",
        flavor: "STUDIO",
    };

    const pigData: DeployableTransport = {
        name: "Objects and Events",
        type: "pig-data",
        targetType: "data-pool",
        flavor: "OCDM",
    };

    it("Should list deployables", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/deployments/deployables?", [appPackage, pigData]);

        await new DeploymentService(testContext).getDeployables(false);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            `Name: ${appPackage.name}, Type: ${appPackage.type}`
        );
        expect(loggingTestTransport.logMessages[1].message).toContain(`Name: ${pigData.name}, Type: ${pigData.type}`);
    });

    it("Should list deployables with flavor filter", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/deployments/deployables?flavor=STUDIO", [appPackage]);

        await new DeploymentService(testContext).getDeployables(false, "STUDIO");

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            `Name: ${appPackage.name}, Type: ${appPackage.type}`
        );
    });

    it("Should list deployables as JSON", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/deployments/deployables?", [appPackage, pigData]);

        await new DeploymentService(testContext).getDeployables(true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(
            FileService.fileDownloadedMessage
        )[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            {encoding: "utf-8"}
        );

        const deployableTransports = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as DeployableTransport[];
        expect(deployableTransports.length).toBe(2);

        const appPackageTransport = deployableTransports.filter(transport => transport.name === appPackage.name)[0];
        const pigDataTransport = deployableTransports.filter(transport => transport.name === pigData.name)[0];

        expect(appPackageTransport).toEqual(appPackage);
        expect(pigDataTransport).toEqual(pigData);
    });
});
