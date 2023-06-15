import {logger} from "../../util/logger";
import {assetApi} from "../../api/asset-api";
import {v4 as uuidv4} from "uuid";
import {fileService} from "../file-service";
import {SaveContentNode} from "../../interfaces/save-content-node.interface";

class AssetService {
    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    public async listAssets(assetType: string): Promise<void> {
        const nodes = await assetApi.findAllAssets(assetType);
        nodes.forEach(node => {
            logger.info(`${node.name} - Key: "${node.key}"`);
        });
    }

    public async findAndExportAllAssets(assetType: string): Promise<void> {
        const fieldsToInclude = ["key", "name", "assetType", "rootNodeKey", "activatedDraftId"];

        const nodes: SaveContentNode[] = await assetApi.findAllAssets(assetType);

        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(nodes, fieldsToInclude), filename);
        logger.info(this.fileDownloadedMessage + filename);
    }
}

export const assetService = new AssetService();