import { AssetRegistryApi } from "./asset-registry-api";
import { AssetRegistryDescriptor } from "./asset-registry.interfaces";
import { Context } from "../../core/command/cli-context";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { v4 as uuidv4 } from "uuid";

export class AssetRegistryService {
    private api: AssetRegistryApi;

    constructor(context: Context) {
        this.api = new AssetRegistryApi(context);
    }

    public async listTypes(jsonResponse: boolean): Promise<void> {
        const metadata = await this.api.listTypes();
        const descriptors = Object.values(metadata.types);

        if (jsonResponse) {
            const filename = uuidv4() + ".json";
            fileService.writeToFileWithGivenName(JSON.stringify(metadata), filename);
            logger.info(FileService.fileDownloadedMessage + filename);
        } else {
            if (descriptors.length === 0) {
                logger.info("No asset types registered.");
                return;
            }
            descriptors.forEach((descriptor) => {
                this.logDescriptorSummary(descriptor);
            });
        }
    }

    public async getType(assetType: string, jsonResponse: boolean): Promise<void> {
        const descriptor = await this.api.getType(assetType);

        if (jsonResponse) {
            const filename = uuidv4() + ".json";
            fileService.writeToFileWithGivenName(JSON.stringify(descriptor), filename);
            logger.info(FileService.fileDownloadedMessage + filename);
        } else {
            this.logDescriptorDetail(descriptor);
        }
    }

    public async getSchema(assetType: string, jsonResponse: boolean): Promise<void> {
        const data = await this.api.getSchema(assetType);
        this.outputResponse(data, jsonResponse);
    }

    public async getExamples(assetType: string, jsonResponse: boolean): Promise<void> {
        const data = await this.api.getExamples(assetType);
        this.outputResponse(data, jsonResponse);
    }

    public async getMethodology(assetType: string, jsonResponse: boolean): Promise<void> {
        const data = await this.api.getMethodology(assetType);
        this.outputResponse(data, jsonResponse);
    }

    private outputResponse(data: any, jsonResponse: boolean): void {
        if (jsonResponse) {
            const filename = uuidv4() + ".json";
            fileService.writeToFileWithGivenName(JSON.stringify(data, null, 2), filename);
            logger.info(FileService.fileDownloadedMessage + filename);
        } else {
            logger.info(typeof data === "string" ? data : JSON.stringify(data, null, 2));
        }
    }

    private logDescriptorSummary(descriptor: AssetRegistryDescriptor): void {
        logger.info(
            `${descriptor.assetType} - ${descriptor.displayName} [${descriptor.group}]`
        );
    }

    private logDescriptorDetail(descriptor: AssetRegistryDescriptor): void {
        logger.info(`Asset Type:   ${descriptor.assetType}`);
        logger.info(`Display Name: ${descriptor.displayName}`);
        if (descriptor.description) {
            logger.info(`Description:  ${descriptor.description}`);
        }
        logger.info(`Group:        ${descriptor.group}`);
        logger.info(`Schema:       v${descriptor.assetSchema.version}`);
        logger.info(`Base Path:    ${descriptor.service.basePath}`);
        logger.info(`Endpoints:`);
        logger.info(`  schema:     ${descriptor.endpoints.schema}`);
        logger.info(`  validate:   ${descriptor.endpoints.validate}`);
        if (descriptor.endpoints.methodology) {
            logger.info(`  methodology: ${descriptor.endpoints.methodology}`);
        }
        if (descriptor.endpoints.examples) {
            logger.info(`  examples:   ${descriptor.endpoints.examples}`);
        }
    }
}
