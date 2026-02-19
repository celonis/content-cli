import {DeploymentStatus, DeploymentTransport} from "../../../src/commands/deployment/deployment.interfaces";
import {mockAxiosGet} from "../../utls/http-requests-mock";
import {DeploymentService} from "../../../src/commands/deployment/deployment.service";
import {testContext} from "../../utls/test-context";
import {loggingTestTransport, mockWriteFileSync} from "../../jest.setup";
import {FileService} from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Deployment list active", () => {
    const deployment: DeploymentTransport = {
        id: "deployment-id",
        packageKey: "package-key",
        packageVersion: "1.0.0",
        deployableType: "app-package",
        status: DeploymentStatus.SUCCESS,
        createdAt: new Date().toISOString(),
        createdBy: "user-id",
        deployedAt: new Date().toISOString(),
        statusMessage: "Deployment in progress",
        target: {
            id: "target-id",
            name: "Target Name",
        },
    };

    it("Should list active deployment for target", async () => {
        const targetId = "target-id";
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/deployments/targets/${targetId}/active`, deployment);

        await new DeploymentService(testContext).getActiveDeploymentForTarget(targetId, false);

        expect(loggingTestTransport.logMessages.length).toBe(1);

        expect(loggingTestTransport.logMessages[0].message).toContain(
            `ID: ${deployment.id}, Package: ${deployment.packageKey}, Version: ${deployment.packageVersion}, Status: ${deployment.status}, Deployed at: ${new Date(deployment.deployedAt).toISOString()}`
        );
    });

    it("Should list active deployment for target as JSON", async () => {
        const targetId = "target-id";
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/deployments/targets/${targetId}/active`, deployment);

        await new DeploymentService(testContext).getActiveDeploymentForTarget(targetId, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(
            FileService.fileDownloadedMessage
        )[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            {encoding: "utf-8"}
        );

        const deploymentTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as DeploymentTransport;

        expect(deploymentTransport).toEqual(deployment);
    });

    it("Should list active deployments for package", async () => {
        const packageKey = "package-key";
        mockAxiosGet(
            `https://myTeam.celonis.cloud/pacman/api/deployments/packages/${packageKey}/active?limit=100&offset=0`,
            [deployment]
        );

        await new DeploymentService(testContext).getActiveDeploymentsForPackage(packageKey, false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            `ID: ${deployment.id}, Package: ${deployment.packageKey}, Version: ${deployment.packageVersion}, Status: ${deployment.status}, Deployed at: ${new Date(deployment.deployedAt).toISOString()}`
        );
    });

    it("Should list active deployments for package with targetIds filter", async () => {
        const packageKey = "package-key";
        const targetIds = ["target-id-1", "target-id-2"];
        mockAxiosGet(
            `https://myTeam.celonis.cloud/pacman/api/deployments/packages/${packageKey}/active?limit=100&offset=0&targetIds=${targetIds.join("%2C")}`,
            [deployment]
        );

        await new DeploymentService(testContext).getActiveDeploymentsForPackage(packageKey, false, targetIds);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            `ID: ${deployment.id}, Package: ${deployment.packageKey}, Version: ${deployment.packageVersion}, Status: ${deployment.status}, Deployed at: ${new Date(deployment.deployedAt).toISOString()}`
        );
    });

    it("Should list active deployments for package with pagination filters", async () => {
        const packageKey = "package-key";
        const limit = "99";
        const offset = "1";
        mockAxiosGet(
            `https://myTeam.celonis.cloud/pacman/api/deployments/packages/${packageKey}/active?limit=${limit}&offset=${offset}`,
            [deployment]
        );

        await new DeploymentService(testContext).getActiveDeploymentsForPackage(
            packageKey,
            false,
            undefined,
            limit,
            offset
        );

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            `ID: ${deployment.id}, Package: ${deployment.packageKey}, Version: ${deployment.packageVersion}, Status: ${deployment.status}, Deployed at: ${new Date(deployment.deployedAt).toISOString()}`
        );
    });

    it("Should list active deployments for package as JSON", async () => {
        const packageKey = "package-key";
        mockAxiosGet(
            `https://myTeam.celonis.cloud/pacman/api/deployments/packages/${packageKey}/active?limit=100&offset=0`,
            [deployment]
        );

        await new DeploymentService(testContext).getActiveDeploymentsForPackage(packageKey, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(
            FileService.fileDownloadedMessage
        )[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            {encoding: "utf-8"}
        );

        const deploymentTransports = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as DeploymentTransport[];
        expect(deploymentTransports.length).toBe(1);

        expect(deploymentTransports[0]).toEqual(deployment);
    });
});
