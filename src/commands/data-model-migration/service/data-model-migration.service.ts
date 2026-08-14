import { v4 as uuidv4 } from "uuid";
import { NodeApi } from "../../configuration-management/api/node-api";
import { SaveNodeTransport } from "../../configuration-management/interfaces/node.interfaces";
import { FileService, fileService } from "../../../core/utils/file-service";
import { logger } from "../../../core/utils/logger";
import { Context } from "../../../core/command/cli-context";
import { DataModelApi } from "../api/data-model-api";
import { DataModelTransport } from "../interfaces/data-model-transport.interfaces";
import { ConversionResult } from "../interfaces/conversion-result.interfaces";
import { DataModelConverterService } from "./data-model-converter.service";

export class DataModelMigrationService {

    private readonly dataModelApi: DataModelApi;
    private readonly nodeApi: NodeApi;
    private readonly converter: DataModelConverterService;

    constructor(context: Context) {
        this.dataModelApi = new DataModelApi(context);
        this.nodeApi = new NodeApi(context);
        this.converter = new DataModelConverterService();
    }

    /** Downloads a data model transport payload from cloud-data-integration. */
    public async exportDataModel(poolId: string, dataModelId: string, outputToJsonFile: boolean): Promise<void> {
        const transport = await this.dataModelApi.findOneTransport(poolId, dataModelId, true);
        const payload = JSON.stringify(transport, null, 4);

        if (outputToJsonFile) {
            const fileName = `${uuidv4()}_data_model_${dataModelId}.json`;
            fileService.writeToFileWithGivenName(payload, fileName);
            logger.info(FileService.fileDownloadedMessage + fileName);
            return;
        }

        logger.info("Exported Data Model:\n" + payload);
    }

    /** Converts a data model transport and pushes semantic entity nodes into a target package. */
    public async pushSemanticModel(options: PushSemanticModelOptions): Promise<void> {
        const transport = await this.loadTransport(options);
        const bindingSchema = DataModelConverterService.deriveBindingSchema(options.poolId, options.schema);
        const conversion = this.converter.convert(transport, {
            poolId: options.poolId,
            bindingSchema,
            packageKey: options.packageKey,
            namespace: options.namespace,
        });

        if (options.dryRun) {
            this.logDryRun(conversion, options.outputToJsonFile);
            return;
        }

        await this.pushConversion(options.packageKey, conversion);
        logger.info(
            `Successfully pushed semantic model to package '${options.packageKey}': `
            + `${conversion.objects.length} objects, `
            + `${conversion.eventSources.length} event sources, `
            + `${conversion.relationships.length} relationships, `
            + "1 perspective"
        );
    }

    private async loadTransport(options: PushSemanticModelOptions): Promise<DataModelTransport> {
        if (options.fromFile) {
            return JSON.parse(fileService.readFile(options.fromFile)) as DataModelTransport;
        }
        return this.dataModelApi.findOneTransport(options.poolId, options.dataModelId, true);
    }

    private async pushConversion(packageKey: string, conversion: ConversionResult): Promise<void> {
        const nodes: SaveNodeTransport[] = [
            ...conversion.objects,
            ...conversion.eventSources,
            ...conversion.relationships,
            conversion.perspective,
        ];

        for (const node of nodes) {
            await this.nodeApi.createStagingNode(packageKey, node, false);
        }
    }

    private logDryRun(conversion: ConversionResult, outputToJsonFile?: boolean): void {
        const payload = JSON.stringify(conversion, null, 4);
        if (outputToJsonFile) {
            const fileName = `${uuidv4()}_semantic_model_dry_run.json`;
            fileService.writeToFileWithGivenName(payload, fileName);
            logger.info(FileService.fileDownloadedMessage + fileName);
            return;
        }
        logger.info("Dry run semantic model conversion:\n" + payload);
    }
}

export interface PushSemanticModelOptions {
    poolId: string;
    dataModelId: string;
    packageKey: string;
    schema?: string;
    namespace?: string;
    fromFile?: string;
    dryRun?: boolean;
    outputToJsonFile?: boolean;
}
