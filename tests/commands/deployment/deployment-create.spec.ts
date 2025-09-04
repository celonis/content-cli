import { DeploymentStatus, DeploymentTransport } from "../../../src/commands/deployment/deployment.interfaces";
import { mockAxiosPost } from "../../utls/http-requests-mock";
import { DeploymentService } from "../../../src/commands/deployment/deployment.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Deployment create", () => {
    const deployment: DeploymentTransport = {
        id: "deployment-id",
        packageKey: "package-key",
        packageVersion: "1.0.0",
        deployableType: "app-package",
        status: DeploymentStatus.IN_PROGRESS,
        createdAt: new Date().toISOString(),
        createdBy: "user-id",
        deployedAt: new Date().toISOString(),
        statusMessage: "Deployment in progress",
        target: {
            id: "target-id",
            name: "Target Name",
        },
    };

    it("Should return created deployment", async () => {
        mockAxiosPost("https://myTeam.celonis.cloud/pacman/api/deployments", deployment);

        await new DeploymentService(testContext).createDeployment(deployment.packageKey, deployment.packageVersion, deployment.deployableType, deployment.target.id, false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(`Deployment created with ID: ${deployment.id}, Status: ${deployment.status}`);
    });

    it("Should return created deployment as JSON", async () => {
        mockAxiosPost("https://myTeam.celonis.cloud/pacman/api/deployments", deployment);

        await new DeploymentService(testContext).createDeployment(deployment.packageKey, deployment.packageVersion, deployment.deployableType, deployment.target.id, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const deploymentTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as DeploymentTransport;

        expect(deploymentTransport).toEqual(deployment);
    });
})