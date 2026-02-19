import { DeploymentApi } from "./deployment-api";
import {
  CreateDeploymentRequest,
  fromString,
  GetDeploymentsRequest,
} from "./deployment.interfaces";
import { Context } from "../../core/command/cli-context";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { v4 as uuidv4 } from "uuid";

export class DeploymentService {
  private deploymentApi: DeploymentApi;

  constructor(context: Context) {
    this.deploymentApi = new DeploymentApi(context);
  }

  public async createDeployment(
    packageKey: string,
    packageVersion: string,
    deployableType: string,
    targetId: string,
    jsonResponse: boolean,
  ): Promise<void> {
    const request: CreateDeploymentRequest = {
      packageKey,
      packageVersion,
      deployableType,
      targetId,
    };

    const deployment = await this.deploymentApi.createDeployment(request);

    if (jsonResponse) {
      const filename = uuidv4() + ".json";
      fileService.writeToFileWithGivenName(
        JSON.stringify(deployment),
        filename,
      );
      logger.info(FileService.fileDownloadedMessage + filename);
    } else {
      logger.info(
        `Deployment created with ID: ${deployment.id}, Status: ${deployment.status}`,
      );
    }
  }

  public async getDeployments(
    jsonResponse: boolean,
    packageKey?: string,
    targetId?: string,
    deployableType?: string,
    status?: string,
    createdBy?: string,
    limit?: string,
    offset?: string,
  ): Promise<void> {
    const filter: GetDeploymentsRequest = {
      packageKey,
      targetId,
      deployableType,
      status: fromString(status),
      createdBy,
    };
    const deployments = await this.deploymentApi.getDeployments(
      filter,
      limit,
      offset,
    );

    if (jsonResponse) {
      const filename = uuidv4() + ".json";
      fileService.writeToFileWithGivenName(
        JSON.stringify(deployments),
        filename,
      );
      logger.info(FileService.fileDownloadedMessage + filename);
    } else {
      deployments.forEach(deployment => {
        logger.info(
          `ID: ${deployment.id}, Package: ${deployment.packageKey}, Version: ${deployment.packageVersion}, Status: ${deployment.status}, Created at: ${new Date(deployment.createdAt).toISOString()}`,
        );
      });
    }
  }

  public async getActiveDeploymentForTarget(
    targetId: string,
    jsonResponse: boolean,
  ): Promise<void> {
    const deployment =
      await this.deploymentApi.getActiveDeploymentForTarget(targetId);

    if (jsonResponse) {
      const filename = uuidv4() + ".json";
      fileService.writeToFileWithGivenName(
        JSON.stringify(deployment),
        filename,
      );
      logger.info(FileService.fileDownloadedMessage + filename);
    } else {
      logger.info(
        `ID: ${deployment.id}, Package: ${deployment.packageKey}, Version: ${deployment.packageVersion}, Status: ${deployment.status}, Deployed at: ${new Date(deployment.deployedAt).toISOString()}`,
      );
    }
  }

  public async getActiveDeploymentsForPackage(
    packageKey: string,
    jsonResponse: boolean,
    targetIds?: string[],
    limit?: string,
    offset?: string,
  ): Promise<void> {
    const deployments = await this.deploymentApi.getActiveDeploymentsForPackage(
      packageKey,
      targetIds,
      limit,
      offset,
    );

    if (jsonResponse) {
      const filename = uuidv4() + ".json";
      fileService.writeToFileWithGivenName(
        JSON.stringify(deployments),
        filename,
      );
      logger.info(FileService.fileDownloadedMessage + filename);
    } else {
      deployments.forEach(deployment => {
        logger.info(
          `ID: ${deployment.id}, Package: ${deployment.packageKey}, Version: ${deployment.packageVersion}, Status: ${deployment.status}, Deployed at: ${new Date(deployment.deployedAt).toISOString()}`,
        );
      });
    }
  }

  public async getTargets(
    jsonResponse: boolean,
    deployableType: string,
    packageKey: string,
  ): Promise<void> {
    const targets = await this.deploymentApi.getTargets(
      deployableType,
      packageKey,
    );

    if (jsonResponse) {
      const filename = uuidv4() + ".json";
      fileService.writeToFileWithGivenName(JSON.stringify(targets), filename);
      logger.info(FileService.fileDownloadedMessage + filename);
    } else {
      targets.forEach(target => {
        logger.info(`ID: ${target.id}, Name: ${target.name}`);
      });
    }
  }

  public async getDeployables(
    jsonResponse: boolean,
    flavor?: string,
  ): Promise<void> {
    const deployables = await this.deploymentApi.getDeployables(flavor);

    if (jsonResponse) {
      const filename = uuidv4() + ".json";
      fileService.writeToFileWithGivenName(
        JSON.stringify(deployables),
        filename,
      );
      logger.info(FileService.fileDownloadedMessage + filename);
    } else {
      deployables.forEach(deployable => {
        logger.info(`Name: ${deployable.name}, Type: ${deployable.type}`);
      });
    }
  }
}
