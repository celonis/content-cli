import * as fs from "node:fs";
import AdmZip = require("adm-zip");
import { Context } from "../../core/command/cli-context";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { GitService } from "../../core/git-profile/git/git.service";
import { SinglePackageExportApi } from "./api/single-package-export-api";
import { StagingPackageVariablesApi } from "./api/staging-package-variables-api";
import { CuiFileService } from "../../core/utils/cui-file-service";
import { PackageTargetFile } from "./interfaces/package-target-file.interfaces";

export class SinglePackageExportService {

    private static readonly PACKAGE_FILE = "package.json";
    private static readonly VARIABLES_FILE = "variables.json";
    private static readonly NODES_DIRECTORY = "nodes";
    private static readonly PACKAGE_ENTRIES = [
        SinglePackageExportService.PACKAGE_FILE,
        SinglePackageExportService.VARIABLES_FILE,
        SinglePackageExportService.NODES_DIRECTORY,
    ];

    private readonly singlePackageExportApi: SinglePackageExportApi;
    private readonly stagingPackageVariablesApi: StagingPackageVariablesApi;
    private readonly gitService: GitService;
    private readonly cuiFileService: CuiFileService;

    constructor(context: Context) {
        this.singlePackageExportApi = new SinglePackageExportApi(context);
        this.stagingPackageVariablesApi = new StagingPackageVariablesApi(context);
        this.gitService = new GitService(context);
        this.cuiFileService = new CuiFileService(context);
    }

    public async exportPackage(
        packageKey: string,
        zip: boolean,
        gitBranch: string,
        portable: boolean = false,
        targetFile?: string
    ): Promise<void> {
        const exportedData = await this.singlePackageExportApi.exportPackage(packageKey);
        const packageData = portable ? this.toPortablePackage(exportedData) : exportedData;

        if (targetFile) {
            await this.writeTargetFile(packageKey, targetFile);
        }

        if (gitBranch) {
            await this.exportToGitBranch(packageData, gitBranch);
            return;
        }

        if (zip) {
            const fileName = await this.cuiFileService.writeZipToFileWithGivenName(packageData, `${packageKey}.zip`);
            logger.info(FileService.fileDownloadedMessage + fileName);
            return;
        }

        const directoryName = await this.cuiFileService.writeDirectoryWithGivenName(
            targetDir => fileService.extractZipBufferToDirectory(packageData, targetDir),
            packageKey
        );
        logger.info(`Successful export. Exported directory: ${directoryName}`);
    }

    private async exportToGitBranch(packageData: Buffer, gitBranch: string): Promise<void> {
        const extractedDirectory = fileService.extractZipBufferToTempDirectory(packageData);
        try {
            await this.gitService.pushToBranch(extractedDirectory, gitBranch, SinglePackageExportService.PACKAGE_ENTRIES);
            logger.info("Successfully exported package to branch: " + gitBranch);
        } finally {
            fs.rmSync(extractedDirectory, { recursive: true, force: true });
        }
    }

    private toPortablePackage(packageData: Buffer): Buffer {
        const zip = new AdmZip(packageData);
        if (zip.getEntry(SinglePackageExportService.VARIABLES_FILE)) {
            zip.deleteFile(SinglePackageExportService.VARIABLES_FILE);
        }

        for (const entry of zip.getEntries()) {
            if (entry.isDirectory) {
                continue;
            }
            if (entry.entryName === SinglePackageExportService.PACKAGE_FILE) {
                this.updateJsonEntry(zip, entry, packageJson => this.removeField(packageJson, "key"));
            } else if (this.isNodeFile(entry.entryName)) {
                this.updateJsonEntry(zip, entry, nodeJson => this.removeField(nodeJson?.additionalFields, "spaceId"));
            }
        }
        return zip.toBuffer();
    }

    private isNodeFile(entryName: string): boolean {
        return entryName.startsWith(`${SinglePackageExportService.NODES_DIRECTORY}/`) && entryName.endsWith(".json");
    }

    private updateJsonEntry(zip: AdmZip, entry: AdmZip.IZipEntry, update: (json: any) => boolean): void {
        const json = JSON.parse(entry.getData().toString("utf-8"));
        if (update(json)) {
            zip.updateFile(entry, Buffer.from(JSON.stringify(json, null, 2), "utf-8"));
        }
    }

    private removeField(json: any, field: string): boolean {
        if (json && typeof json === "object" && field in json) {
            delete json[field];
            return true;
        }
        return false;
    }

    private async writeTargetFile(packageKey: string, targetFile: string): Promise<void> {
        const manifests = await this.stagingPackageVariablesApi.findAllByPackageKeys([packageKey]);
        const variables = manifests.find(manifest => manifest.packageKey === packageKey)?.variables ?? [];

        const target: PackageTargetFile = {
            packageKey,
            variables: variables.map(variable => ({
                key: variable.key,
                type: variable.type,
                value: variable.value,
            })),
        };

        fileService.writeToFileWithGivenName(JSON.stringify(target, null, 2), targetFile);
        logger.info(`Target file written: ${targetFile}`);
    }
}
