import * as AdmZip from "adm-zip";
import {Readable} from "stream";
import * as FormData from "form-data";
import {v4 as uuidv4} from "uuid";
import {logger} from "../../core/utils/logger";
import {fileService, FileService} from "../../core/utils/file-service";
import {Context} from "../../core/command/cli-context";
import {PackageDiffMetadata, PackageDiffTransport} from "./interfaces/diff-package.interfaces";
import {DiffApi} from "./api/diff-api";

export class DiffService {
    private diffApi: DiffApi;

    constructor(context: Context) {
        this.diffApi = new DiffApi(context);
    }

    public async diffPackages(file: string, hasChanges: boolean, jsonResponse: boolean): Promise<void> {
        if (hasChanges) {
            await this.hasChanges(file, jsonResponse);
        } else {
            await this.diffPackagesAndReturnDiff(file, jsonResponse);
        }
    }

    private async hasChanges(file: string, jsonResponse: boolean): Promise<void> {
        const packages = new AdmZip(file);
        const formData = this.buildBodyForDiff(packages);
        const returnedHasChangesData = await this.diffApi.hasChanges(formData);

        if (jsonResponse) {
            this.exportListOfPackageDiffMetadata(returnedHasChangesData);
        } else {
            logger.info(this.buildStringResponseForPackageDiffMetadataList(returnedHasChangesData));
        }
    }

    private async diffPackagesAndReturnDiff(file: string, jsonResponse: boolean): Promise<void> {
        const packages = new AdmZip(file);
        const formData = this.buildBodyForDiff(packages);
        const returnedHasChangesData = await this.diffApi.diffPackages(formData);

        if (jsonResponse) {
            this.exportListOfPackageDiffs(returnedHasChangesData);
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
            },
        });
    }

    private exportListOfPackageDiffs(packageDiffs: PackageDiffTransport[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(packageDiffs), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }

    private exportListOfPackageDiffMetadata(packageDiffMetadata: PackageDiffMetadata[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(packageDiffMetadata), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }

    private buildStringResponseForPackageDiffs(packageDiffs: PackageDiffTransport[]): string {
        return "\n" + JSON.stringify(packageDiffs, null, 2);
    }

    private buildStringResponseForPackageDiffMetadataList(packageDiffMetadata: PackageDiffMetadata[]): string {
        return "\n" + JSON.stringify(packageDiffMetadata, null, 2);
    }
}
