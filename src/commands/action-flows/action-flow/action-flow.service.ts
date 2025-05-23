import { v4 as uuidv4 } from "uuid";
import * as AdmZip from "adm-zip";
import * as FormData from "form-data";
import * as fs from "fs";
import { Context } from "../../../core/command/cli-context";
import { ActionFlowApi } from "./action-flow-api";
import { fileService, FileService } from "../../../core/utils/file-service";
import { logger } from "../../../core/utils/logger";

export class ActionFlowService {
    public static readonly METADATA_FILE_NAME = "metadata.json";

    private actionFlowApi: ActionFlowApi;

    constructor(context: Context) {
        this.actionFlowApi = new ActionFlowApi(context);
    }

    public async exportActionFlows(packageId: string, metadataFilePath: string): Promise<void> {
        const exportedActionFlowsData = await this.actionFlowApi.exportRawAssets(packageId);
        const tmpZip: AdmZip = new AdmZip(exportedActionFlowsData);

        const zip = new AdmZip();
        tmpZip.getEntries().forEach(entry => {
            zip.addFile(entry.entryName, entry.getData());
        });

        if (metadataFilePath) {
            this.attachMetadataFile(metadataFilePath, zip);
        }

        const fileName = "action-flows_export_" + uuidv4() + ".zip";
        zip.writeZip(fileName);
        logger.info(FileService.fileDownloadedMessage + fileName);
    }

    public async analyzeActionFlows(packageId: string, outputToJsonFile: boolean): Promise<void> {
        const actionFlowsMetadata = await this.actionFlowApi.analyzeAssets(packageId);
        const actionFlowsMetadataString = JSON.stringify(actionFlowsMetadata, null, 4);

        if (outputToJsonFile) {
            const metadataFileName = "action-flows_metadata_" + uuidv4() + ".json";
            fileService.writeToFileWithGivenName(actionFlowsMetadataString, metadataFileName);
            logger.info(FileService.fileDownloadedMessage + metadataFileName);
        } else {
            logger.info("Action flows analyze metadata: \n" + actionFlowsMetadataString);
        }
    }

    public async importActionFlows(packageId: string, filePath: string, dryRun: boolean, outputToJsonFile: boolean): Promise<void> {
        const actionFlowsZip = this.createBodyForImport(filePath);
        const eventLog = await this.actionFlowApi.importAssets(packageId, actionFlowsZip, dryRun);
        const eventLogString = JSON.stringify(eventLog, null, 4);

        if (outputToJsonFile) {
            const eventLogFileName = "action-flows_import_event_log_" + uuidv4() + ".json";
            fileService.writeToFileWithGivenName(eventLogString, eventLogFileName);
            logger.info(FileService.fileDownloadedMessage + eventLogFileName);
        } else {
            logger.info("Action flows import event log: \n" + eventLogString);
        }
    }

    private createBodyForImport(fileName: string): FormData {
        fileName = fileName + (fileName.endsWith(".zip") ? "" : ".zip");

        const formData = new FormData();
        formData.append("file", fs.createReadStream(fileName, { encoding: null }), { filename: fileName });

        return formData;
    }

    private attachMetadataFile(fileName: string, zip: AdmZip): void {
        fileName = fileName + (fileName.endsWith(".json") ? "" : ".json");
        const metadata = fileService.readFile(fileName);

        zip.addFile(ActionFlowService.METADATA_FILE_NAME, Buffer.from(metadata));
    }
}
