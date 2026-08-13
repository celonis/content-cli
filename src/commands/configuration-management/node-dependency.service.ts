import { NodeDependencyApi } from "./api/node-dependency-api";
import { Context } from "../../core/command/cli-context";
import { FileService } from "../../core/utils/file-service";
import { CuiFileService } from "../../core/utils/cui-file-service";
import { logger } from "../../core/utils/logger";
import { v4 as uuidv4 } from "uuid";
import { NodeDependencyTransport } from "./interfaces/node-dependency.interfaces";

export class NodeDependencyService {
    private readonly nodeDependencyApi: NodeDependencyApi;
    private readonly cuiFileService: CuiFileService;

    constructor(context: Context) {
        this.nodeDependencyApi = new NodeDependencyApi(context);
        this.cuiFileService = new CuiFileService(context);
    }

    public async listNodeDependencies(packageKey: string, nodeKey: string, version: string, jsonResponse: boolean): Promise<void> {
        let dependencies : NodeDependencyTransport[];

        if (version) {
            dependencies = await this.nodeDependencyApi.findAllByVersion(packageKey, nodeKey, version);
        } else {
            dependencies = await this.nodeDependencyApi.findAllStaging(packageKey, nodeKey);
        }

        if (jsonResponse) {
            const filename = uuidv4() + ".json";
            const writtenFilename = await this.cuiFileService.writeToFileWithGivenName(JSON.stringify(dependencies, null, 2), filename);
            logger.info(FileService.fileDownloadedMessage + writtenFilename);
        } else {
            if (dependencies.length === 0) {
                logger.info("No dependencies found for this node.");
            } else {
                logger.info(`Found ${dependencies.length} ${dependencies.length === 1 ? "dependency" : "dependencies"}:`);
                dependencies.forEach((dep, index) => {
                    logger.info(JSON.stringify(dep));
                });
            }
        }
    }
}
