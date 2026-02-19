import {
  DeployableTransport,
  TargetTransport,
} from "../../../src/commands/deployment/deployment.interfaces";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { DeploymentService } from "../../../src/commands/deployment/deployment.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Deployment list targets", () => {
  const firstTarget: TargetTransport = {
    id: "target-1",
    name: "First target",
  };

  const secondTarget: TargetTransport = {
    id: "target-2",
    name: "Second target",
  };

  it("Should list targets", async () => {
    mockAxiosGet(
      "https://myTeam.celonis.cloud/pacman/api/deployments/targets?deployableType=app-package&packageKey=package-key",
      [firstTarget, secondTarget],
    );

    await new DeploymentService(testContext).getTargets(
      false,
      "app-package",
      "package-key",
    );

    expect(loggingTestTransport.logMessages.length).toBe(2);
    expect(loggingTestTransport.logMessages[0].message).toContain(
      `ID: ${firstTarget.id}, Name: ${firstTarget.name}`,
    );
    expect(loggingTestTransport.logMessages[1].message).toContain(
      `ID: ${secondTarget.id}, Name: ${secondTarget.name}`,
    );
  });

  it("Should list targets as JSON", async () => {
    mockAxiosGet(
      "https://myTeam.celonis.cloud/pacman/api/deployments/targets?deployableType=app-package&packageKey=package-key",
      [firstTarget, secondTarget],
    );

    await new DeploymentService(testContext).getTargets(
      true,
      "app-package",
      "package-key",
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      expect.any(String),
      { encoding: "utf-8" },
    );

    const targetTransports = JSON.parse(
      mockWriteFileSync.mock.calls[0][1],
    ) as DeployableTransport[];
    expect(targetTransports.length).toBe(2);

    const firstTargetTransport = targetTransports.filter(
      transport => transport.name === firstTarget.name,
    )[0];
    const secondTargetTransport = targetTransports.filter(
      transport => transport.name === secondTarget.name,
    )[0];

    expect(firstTargetTransport).toEqual(firstTarget);
    expect(secondTargetTransport).toEqual(secondTarget);
  });
});
