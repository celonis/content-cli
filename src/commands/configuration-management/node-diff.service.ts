import { v4 as uuidv4 } from "uuid";
import { logger } from "../../core/utils/logger";
import { fileService, FileService } from "../../core/utils/file-service";
import { Context } from "../../core/command/cli-context";
import { NodeDiffApi } from "./api/node-diff-api";
import { NodeConfigurationDiffTransport } from "./interfaces/node-diff.interfaces";

export class NodeDiffService {
  private nodeDiffApi: NodeDiffApi;

  constructor(context: Context) {
    this.nodeDiffApi = new NodeDiffApi(context);
  }

  public async diff(
    packageKey: string,
    nodeKey: string,
    baseVersion: string,
    compareVersion: string,
    jsonResponse: boolean,
  ): Promise<void> {
    const nodeDiff: NodeConfigurationDiffTransport =
      await this.nodeDiffApi.diff({
        packageKey,
        nodeKey,
        baseVersion,
        compareVersion,
      });

    if (jsonResponse) {
      const filename = uuidv4() + ".json";
      fileService.writeToFileWithGivenName(
        JSON.stringify(nodeDiff, null, 2),
        filename,
      );
      logger.info(FileService.fileDownloadedMessage + filename);
    } else {
      logger.info(`Package Key: ${nodeDiff.packageKey}`);
      logger.info(`Node Key: ${nodeDiff.nodeKey}`);
      logger.info(`Name: ${nodeDiff.name}`);
      logger.info(`Type: ${nodeDiff.type}`);
      logger.info(`Is invalid configuration: ${nodeDiff.invalidContent}`);
      if (nodeDiff.parentNodeKey) {
        logger.info(`Parent Node Key: ${nodeDiff.parentNodeKey}`);
      }
      logger.info(
        `Change Date: ${new Date(nodeDiff.changeDate).toISOString()}`,
      );
      logger.info(`Updated By: ${nodeDiff.updatedBy}`);
      logger.info(`Change Type: ${nodeDiff.changeType}`);
      logger.info(`Changes: ${JSON.stringify(nodeDiff.changes)}`);
      logger.info(
        `Metadata Changes: ${JSON.stringify(nodeDiff.metadataChanges)}`,
      );
    }
  }
}
