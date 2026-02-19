import {
  DeploymentStatus,
  DeploymentTransport,
} from "../../../src/commands/deployment/deployment.interfaces";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { DeploymentService } from "../../../src/commands/deployment/deployment.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Deployments list history", () => {
  const deploymentTransport: DeploymentTransport = {
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

  it("Should list deployment history", async () => {
    mockAxiosGet(
      "https://myTeam.celonis.cloud/pacman/api/deployments/history?limit=100&offset=0",
      [deploymentTransport],
    );

    await new DeploymentService(testContext).getDeployments(false);

    expect(loggingTestTransport.logMessages.length).toBe(1);
    expect(loggingTestTransport.logMessages[0].message).toContain(
      `ID: ${deploymentTransport.id}, Package: ${deploymentTransport.packageKey}, Version: ${deploymentTransport.packageVersion}, Status: ${deploymentTransport.status}, Created at: ${new Date(deploymentTransport.createdAt).toISOString()}`,
    );
  });

  it("Should list deployment history with filter params", async () => {
    mockAxiosGet(
      "https://myTeam.celonis.cloud/pacman/api/deployments/history?limit=100&offset=0&packageKey=package-key&targetId=target-id&deployableType=app-package&status=IN_PROGRESS&createdBy=user-id",
      [deploymentTransport],
    );

    await new DeploymentService(testContext).getDeployments(
      false,
      "package-key",
      "target-id",
      "app-package",
      "IN_PROGRESS",
      "user-id",
    );

    expect(loggingTestTransport.logMessages.length).toBe(1);
    expect(loggingTestTransport.logMessages[0].message).toContain(
      `ID: ${deploymentTransport.id}, Package: ${deploymentTransport.packageKey}, Version: ${deploymentTransport.packageVersion}, Status: ${deploymentTransport.status}, Created at: ${new Date(deploymentTransport.createdAt).toISOString()}`,
    );
  });

  it("Should list deployment history with pagination params", async () => {
    mockAxiosGet(
      "https://myTeam.celonis.cloud/pacman/api/deployments/history?limit=3&offset=3",
      [deploymentTransport],
    );

    await new DeploymentService(testContext).getDeployments(
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "3",
      "3",
    );

    expect(loggingTestTransport.logMessages.length).toBe(1);
    expect(loggingTestTransport.logMessages[0].message).toContain(
      `ID: ${deploymentTransport.id}, Package: ${deploymentTransport.packageKey}, Version: ${deploymentTransport.packageVersion}, Status: ${deploymentTransport.status}, Created at: ${new Date(deploymentTransport.createdAt).toISOString()}`,
    );
  });

  it("Should list deployment history as JSON", async () => {
    mockAxiosGet(
      "https://myTeam.celonis.cloud/pacman/api/deployments/history?limit=100&offset=0",
      [deploymentTransport],
    );

    await new DeploymentService(testContext).getDeployments(true);

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      expect.any(String),
      { encoding: "utf-8" },
    );

    const deploymentTransports = JSON.parse(
      mockWriteFileSync.mock.calls[0][1],
    ) as DeploymentTransport[];
    expect(deploymentTransports.length).toBe(1);

    expect(deploymentTransports[0]).toEqual(deploymentTransport);
  });
});
