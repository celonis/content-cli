import { NodeApi } from "./api/node-api";
import { Context } from "../../core/command/cli-context";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { v4 as uuidv4 } from "uuid";
import { NodeTransport } from "./interfaces/node.interfaces";

export class NodeService {
  private nodeApi: NodeApi;

  constructor(context: Context) {
    this.nodeApi = new NodeApi(context);
  }

  public async findNode(
    packageKey: string,
    nodeKey: string,
    withConfiguration: boolean,
    packageVersion: string | null,
    jsonResponse: boolean,
  ): Promise<void> {
    const node = packageVersion
      ? await this.nodeApi.findVersionedNodeByKey(
          packageKey,
          nodeKey,
          packageVersion,
          withConfiguration,
        )
      : await this.nodeApi.findStagingNodeByKey(
          packageKey,
          nodeKey,
          withConfiguration,
        );

    if (jsonResponse) {
      const filename = uuidv4() + ".json";
      fileService.writeToFileWithGivenName(
        JSON.stringify(node, null, 2),
        filename,
      );
      logger.info(FileService.fileDownloadedMessage + filename);
    } else {
      this.printNode(node);
    }
  }

  public async listNodes(
    packageKey: string,
    packageVersion: string,
    limit: number,
    offset: number,
    withConfiguration: boolean,
    jsonResponse: boolean,
  ): Promise<void> {
    const nodes: NodeTransport[] =
      await this.nodeApi.findVersionedNodesByPackage(
        packageKey,
        packageVersion,
        withConfiguration,
        limit,
        offset,
      );

    if (jsonResponse) {
      const filename = uuidv4() + ".json";
      fileService.writeToFileWithGivenName(
        JSON.stringify(nodes, null, 2),
        filename,
      );
      logger.info(FileService.fileDownloadedMessage + filename);
    } else {
      nodes.forEach(node => {
        logger.info(JSON.stringify(node));
      });
    }
  }

  private printNode(node: NodeTransport): void {
    logger.info(`ID: ${node.id}`);
    logger.info(`Key: ${node.key}`);
    logger.info(`Name: ${node.name}`);
    logger.info(`Type: ${node.type}`);
    logger.info(`Package Node Key: ${node.packageNodeKey}`);
    if (node.parentNodeKey) {
      logger.info(`Parent Node Key: ${node.parentNodeKey}`);
    }
    logger.info(`Created By: ${node.createdBy}`);
    logger.info(`Updated By: ${node.updatedBy}`);
    logger.info(`Creation Date: ${new Date(node.creationDate).toISOString()}`);
    logger.info(`Change Date: ${new Date(node.changeDate).toISOString()}`);
    if (node.configuration) {
      logger.info(
        `Configuration: ${JSON.stringify(node.configuration, null, 2)}`,
      );
    }
    if (node.invalidContent) {
      logger.info(`Invalid Configuration: ${node.invalidConfiguration}`);
    }
    logger.info(`Flavor: ${node.flavor}`);
  }
}
