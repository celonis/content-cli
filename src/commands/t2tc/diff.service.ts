import * as AdmZip from "adm-zip";
import {Readable} from "stream";
import * as FormData from "form-data";
import {v4 as uuidv4} from "uuid";
import { logger } from "../../core/utils/logger";
import { FileService } from "../../core/utils/file-service";
import { CuiFileService } from "../../core/utils/cui-file-service";
import { Context } from "../../core/command/cli-context";
import { PackageDiffMetadata, PackageDiffTransport } from "../configuration-management/interfaces/diff-package.interfaces";
import { DiffApi } from "./api/diff-api";

export class DiffService {

    private diffApi: DiffApi;
    private readonly cuiFileService: CuiFileService;

    constructor(context: Context) {
        this.diffApi = new DiffApi(context);
        this.cuiFileService = new CuiFileService(context);
    }

    public async diffPackages(file: string, hasChanges: boolean, baseVersion: string, jsonResponse: boolean): Promise<void> {
        if (hasChanges) {
            await this.hasChanges(baseVersion, file, jsonResponse);
        } else {
            await this.diffPackagesAndReturnDiff(baseVersion, file, jsonResponse);
        }
    }

    private async hasChanges(baseVersion: string, file: string, jsonResponse: boolean): Promise<void> {
        const packages = new AdmZip(file);
        const formData = this.buildBodyForDiff(packages);
        const returnedHasChangesData = await this.diffApi.hasChanges(baseVersion, formData);

        if (jsonResponse) {
            await this.exportListOfPackageDiffMetadata(returnedHasChangesData);
        } else {
            logger.info(this.buildStringResponseForPackageDiffMetadataList(returnedHasChangesData));
        }
    }

    private async diffPackagesAndReturnDiff(baseVersion: string, file: string, jsonResponse: boolean): Promise<void> {
        const packages = new AdmZip(file);
        const formData = this.buildBodyForDiff(packages);
        const returnedHasChangesData = await this.diffApi.diffPackages(baseVersion, formData);

        if (jsonResponse) {
            await this.exportListOfPackageDiffs(returnedHasChangesData);
        } else {
            logger.info(this.buildStringResponseForPackageDiffs(returnedHasChangesData));
        }
    }

    private buildBodyForDiff(packages: AdmZip): FormData {
        const formData = new FormData();
        const readableStream = this.getReadableStream(packages);

        formData.append("file", readableStream, {filename: "packages.zip"});

        return formData;
    }

    private getReadableStream(packages: AdmZip): Readable {
        return new Readable({
            read(): void {
                this.push(packages.toBuffer());
                this.push(null);
            }
        });
    }

    private async exportListOfPackageDiffs(packageDiffs: PackageDiffTransport[]): Promise<void> {
        const filename = uuidv4() + ".json";
        const writtenFilename = await this.cuiFileService.writeToFileWithGivenName(JSON.stringify(packageDiffs), filename);
        logger.info(FileService.fileDownloadedMessage + writtenFilename);
    }

    private async exportListOfPackageDiffMetadata(packageDiffMetadata: PackageDiffMetadata[]): Promise<void> {
        const filename = uuidv4() + ".json";
        const writtenFilename = await this.cuiFileService.writeToFileWithGivenName(JSON.stringify(packageDiffMetadata), filename);
        logger.info(FileService.fileDownloadedMessage + writtenFilename);
    }

    private buildStringResponseForPackageDiffs(packageDiffs: PackageDiffTransport[]): string {
        return "\n" + JSON.stringify(packageDiffs, null, 2);
    }

    private buildStringResponseForPackageDiffMetadataList(packageDiffMetadata: PackageDiffMetadata[]): string {
        return "\n" + JSON.stringify(packageDiffMetadata, null, 2);
    }
}
