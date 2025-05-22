import {v4 as uuidv4} from "uuid";
import { Context } from "../../../core/command/cli-context";
import { SaveContentNode } from "../interfaces/save-content-node.interface";
import { AssetApi } from "../api/asset-api";
import { logger } from "../../../core/utils/logger";
import { fileService } from "../../../core/utils/file-service";

export class AssetService {
    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    private assetApi: AssetApi;

    constructor(context: Context) {
        this.assetApi = new AssetApi(context);
    }

    public async listAssets(assetType: string): Promise<void> {
        const nodes = await this.assetApi.findAllAssets(assetType);
        nodes.forEach(node => {
            logger.info(`${node.name} - Key: "${node.key}"`);
        });
    }

    public async findAndExportAllAssets(assetType: string): Promise<void> {
        const fieldsToInclude = ["key", "name", "assetType", "rootNodeKey", "activatedDraftId"];

        const nodes: SaveContentNode[] = await this.assetApi.findAllAssets(assetType);

        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(nodes, fieldsToInclude), filename);
        logger.info(this.fileDownloadedMessage + filename);
    }
}
