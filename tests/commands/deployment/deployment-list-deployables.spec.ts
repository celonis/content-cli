import { DeployableTransport } from "../../../src/commands/deployment/deployment.interfaces";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { DeploymentService } from "../../../src/commands/deployment/deployment.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { getJsonFromDownloadedFile } from "../../utls/fs-utils";

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
    }

    it("Should list deployables", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/deployments/deployables?", [appPackage, pigData]);

        await new DeploymentService(testContext).getDeployables(false);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message).toContain(`Name: ${appPackage.name}, Type: ${appPackage.type}`);
        expect(loggingTestTransport.logMessages[1].message).toContain(`Name: ${pigData.name}, Type: ${pigData.type}`);
    });

    it("Should list deployables with flavor filter", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/deployments/deployables?flavor=STUDIO", [appPackage]);

        await new DeploymentService(testContext).getDeployables(false, "STUDIO");

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(`Name: ${appPackage.name}, Type: ${appPackage.type}`);
    });

    it("Should list deployables as JSON", async () => {
        mockAxiosGet("https://myTeam.celonis.cloud/pacman/api/deployments/deployables?", [appPackage, pigData]);

        await new DeploymentService(testContext).getDeployables(true);

        const deployableTransports = getJsonFromDownloadedFile() as DeployableTransport[];
        expect(deployableTransports.length).toBe(2);

        const appPackageTransport = deployableTransports.filter(transport => transport.name === appPackage.name)[0];
        const pigDataTransport = deployableTransports.filter(transport => transport.name === pigData.name)[0];

        expect(appPackageTransport).toEqual(appPackage);
        expect(pigDataTransport).toEqual(pigData);
    });
})