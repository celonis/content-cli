import { v4 as uuidv4 } from "uuid";
import * as FormData from "form-data";
import { Readable } from "node:stream";
import * as AdmZip from "adm-zip";
import * as fs from "node:fs";
import { Context } from "../../core/command/cli-context";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { GitService } from "../../core/git-profile/git/git.service";
import { SinglePackageImportApi } from "./api/single-package-import-api";
import { SinglePackageImportResult } from "./interfaces/single-package-import.interfaces";

export class SinglePackageImportService {

    private static readonly MAX_UNCOMPRESSED_ZIP_SIZE = 4 * 1024 * 1024 * 1024;

    private readonly singlePackageImportApi: SinglePackageImportApi;
    private readonly gitService: GitService;

    constructor(context: Context) {
        this.singlePackageImportApi = new SinglePackageImportApi(context);
        this.gitService = new GitService(context);
    }

    public async importPackage(file: string, directory: string, overwrite: boolean, jsonResponse: boolean, gitBranch: string): Promise<void> {
        if ((file || directory) && gitBranch) {
            throw new Error("You cannot use --file or --directory together with --gitBranch. Only one import source can be defined.");
        }
        if (!file && !directory && !gitBranch) {
            throw new Error("You must provide a --file, a --directory, or a --gitBranch option to import a package.");
        }

        let gitTempDir: string | undefined;
        try {
            let resolvedSource: { zipPath: string; isTemporary: boolean };
            if (gitBranch) {
                gitTempDir = await this.gitService.pullFromBranch(gitBranch);
                resolvedSource = { zipPath: fileService.zipDirectoryAsSinglePackage(gitTempDir), isTemporary: true };
            } else {
                resolvedSource = this.resolveSource(file, directory);
            }

            try {
                const packageZip = new AdmZip(resolvedSource.zipPath);
                const formData = this.buildBodyForImport(packageZip, resolvedSource.zipPath);
                const result = await this.singlePackageImportApi.importPackage(formData, overwrite);
                this.outputResult(result, jsonResponse);
            } finally {
                if (resolvedSource.isTemporary) {
                    fs.rmSync(resolvedSource.zipPath);
                }
            }
        } finally {
            if (gitTempDir) {
                fs.rmSync(gitTempDir, { recursive: true, force: true });
            }
        }
    }

    private resolveSource(file: string, directory: string): { zipPath: string; isTemporary: boolean } {
        if (file && directory) {
            throw new Error("You cannot use both --file and --directory options at the same time. Only one import source can be defined.");
        }
        if (file) {
            if (fileService.isDirectory(file)) {
                throw new Error("The --file option accepts only zip files.");
            }
            return { zipPath: file, isTemporary: false };
        }
        if (!fileService.isDirectory(directory)) {
            throw new Error("The --directory option accepts only directories.");
        }
        return { zipPath: fileService.zipDirectoryAsSinglePackage(directory), isTemporary: true };
    }

    private buildBodyForImport(packageZip: AdmZip, sourcePath: string): FormData {
        this.assertUncompressedSizeWithinLimit(packageZip, sourcePath);

        const formData = new FormData();
        formData.append("packageFile", this.getReadableStream(packageZip), { filename: "package.zip" });
        return formData;
    }

    private assertUncompressedSizeWithinLimit(packageZip: AdmZip, sourcePath: string): void {
        const totalUncompressedBytes = packageZip.getEntries().reduce((sum, entry) => sum + entry.header.size, 0);
        if (totalUncompressedBytes > SinglePackageImportService.MAX_UNCOMPRESSED_ZIP_SIZE) {
            throw new Error(
                `Failed to handle zip file "${sourcePath}": uncompressed size ${(totalUncompressedBytes / (1024 ** 3)).toFixed(2)} GB exceeds the 4 GB limit.`
            );
        }
    }

    private getReadableStream(packageZip: AdmZip): Readable {
        return new Readable({
            read(): void {
                this.push(packageZip.toBuffer());
                this.push(null);
            },
        });
    }

    private outputResult(result: SinglePackageImportResult, jsonResponse: boolean): void {
        if (jsonResponse) {
            const filename = uuidv4() + ".json";
            fileService.writeToFileWithGivenName(JSON.stringify(result, null, 2), filename);
            logger.info(FileService.fileDownloadedMessage + filename);
            return;
        }

        const importedPackage = result.importedPackage;
        const importedNodes = result.importedNodes ?? [];

        logger.info(`Successfully imported package: ${importedPackage.key}`);
        logger.info(`Name: ${importedPackage.name}`);
        if (importedPackage.flavor) {
            logger.info(`Flavor: ${importedPackage.flavor}`);
        }
        logger.info(`Imported ${importedNodes.length} node(s).`);
        importedNodes.forEach(node => {
            logger.info(`  - ${node.key} (${node.type})`);
        });
    }
}
