import { NodeDependencyApi } from "./api/node-dependency-api";
import { Context } from "../../core/command/cli-context";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { v4 as uuidv4 } from "uuid";
import { NodeDependencyTransport } from "./interfaces/node-dependency.interfaces";

export class NodeDependencyService {
    private nodeDependencyApi: NodeDependencyApi;

    constructor(context: Context) {
        this.nodeDependencyApi = new NodeDependencyApi(context);
    }

    public async listNodeDependencies(packageKey: string, nodeKey: string, version: string, jsonResponse: boolean): Promise<void> {
        const dependencies: NodeDependencyTransport[] = await this.nodeDependencyApi.findAll(packageKey, nodeKey, version);

        if (jsonResponse) {
            const filename = uuidv4() + ".json";
            fileService.writeToFileWithGivenName(JSON.stringify(dependencies, null, 2), filename);
            logger.info(FileService.fileDownloadedMessage + filename);
        } else {
            if (dependencies.length === 0) {
                logger.info("No dependencies found for this node.");
            } else {
                logger.info(`Found ${dependencies.length} dependencies:`);
                dependencies.forEach((dep, index) => {
                    logger.info(`\n[${index + 1}]`);
                    logger.info(`  Package Key: ${dep.packageKey}`);
                    logger.info(`  Key: ${dep.key}`);
                    logger.info(`  Type: ${dep.type}`);
                });
            }
        }
    }
}

