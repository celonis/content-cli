import { NodeApi } from "./api/node-api";
import { Context } from "../../core/command/cli-context";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { v4 as uuidv4 } from "uuid";

export class NodeService {
    private nodeApi: NodeApi;

    constructor(context: Context) {
        this.nodeApi = new NodeApi(context);
    }

    public async findNode(packageKey: string, nodeKey: string, withConfiguration: boolean, jsonResponse: boolean): Promise<void> {
        const node = await this.nodeApi.findStagingNodeByKey(packageKey, nodeKey, withConfiguration);

        if (jsonResponse) {
            const filename = uuidv4() + ".json";
            fileService.writeToFileWithGivenName(JSON.stringify(node, null, 2), filename);
            logger.info(FileService.fileDownloadedMessage + filename);
        } else {
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
                logger.info(`Configuration: ${JSON.stringify(node.configuration, null, 2)}`);
            }
            if (node.invalidContent) {
                logger.info(`Invalid Configuration: ${node.invalidConfiguration}`);
            }
            logger.info(`Flavor: ${node.flavor}`);
        }
    }
}

