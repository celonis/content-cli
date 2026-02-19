import { v4 as uuidv4 } from "uuid";
import * as FormData from "form-data";
import { Readable } from "stream";
import * as AdmZip from "adm-zip";
import { Context } from "../../core/command/cli-context";
import {
  PackageExportTransport,
  PackageKeyAndVersionPair,
  PackageManifestTransport,
  PackageMetadataExportTransport,
  StudioPackageManifest,
  VariableManifestTransport,
} from "./interfaces/package-export.interfaces";
import { BatchExportImportConstants } from "./interfaces/batch-export-import.constants";
import { fileService, FileService } from "../../core/utils/file-service";
import { logger } from "../../core/utils/logger";
import { parse, stringify } from "../../core/utils/json";
import { PackageApi } from "../studio/api/package-api";
import { BatchImportExportApi } from "./api/batch-import-export-api";
import { StudioService } from "./studio.service";
import { GitService } from "../../core/git-profile/git/git.service";
import * as fs from "fs";

export class BatchImportExportService {
  private batchImportExportApi: BatchImportExportApi;

  private studioPackageApi: PackageApi;
  private studioService: StudioService;
  private gitService: GitService;

  constructor(context: Context) {
    this.batchImportExportApi = new BatchImportExportApi(context);

    this.studioPackageApi = new PackageApi(context);
    this.studioService = new StudioService(context);
    this.gitService = new GitService(context);
  }

  public async listActivePackages(flavors: string[]): Promise<void> {
    const activePackages =
      await this.batchImportExportApi.findAllActivePackages(flavors);
    activePackages.forEach(pkg => {
      logger.info(`${pkg.name} - Key: "${pkg.key}"`);
    });
  }

  public async findAndExportListOfActivePackages(
    flavors: string[],
    packageKeys: string[],
    withDependencies: boolean,
  ): Promise<void> {
    let packagesToExport: PackageExportTransport[];

    if (packageKeys.length) {
      packagesToExport =
        await this.batchImportExportApi.findActivePackagesByKeys(
          packageKeys,
          withDependencies,
        );
    } else {
      packagesToExport = await this.batchImportExportApi.findAllActivePackages(
        flavors,
        withDependencies,
      );
    }

    packagesToExport = await this.studioService.getExportPackagesWithStudioData(
      packagesToExport,
      withDependencies,
    );

    this.exportListOfPackages(packagesToExport);
  }

  public async batchExportPackages(
    packageKeys: string[],
    packageKeysByVersion: string[],
    withDependencies: boolean,
    gitBranch: string,
    unzip: boolean,
  ): Promise<void> {
    let exportedPackagesData: Buffer;
    if (packageKeys) {
      exportedPackagesData = await this.batchImportExportApi.exportPackages(
        packageKeys,
        withDependencies,
      );
    } else {
      exportedPackagesData =
        await this.batchImportExportApi.exportPackagesByVersions(
          packageKeysByVersion,
          withDependencies,
        );
    }

    const exportedPackagesZip: AdmZip = new AdmZip(exportedPackagesData);

    const manifest: PackageManifestTransport[] = parse(
      exportedPackagesZip
        .getEntry(BatchExportImportConstants.MANIFEST_FILE_NAME)
        .getData()
        .toString(),
    );

    const versionsByPackageKey = this.getVersionsByPackageKey(manifest);

    let exportedVariables =
      await this.getVersionedVariablesForPackagesWithKeys(versionsByPackageKey);
    exportedVariables =
      this.studioService.fixConnectionVariables(exportedVariables);
    exportedPackagesZip.addFile(
      BatchExportImportConstants.VARIABLES_FILE_NAME,
      Buffer.from(stringify(exportedVariables), "utf8"),
    );

    const studioPackageKeys = manifest
      .filter(
        packageManifest =>
          packageManifest.flavor === BatchExportImportConstants.STUDIO,
      )
      .map(packageManifest => packageManifest.packageKey);

    const studioData =
      await this.studioService.getStudioPackageManifests(studioPackageKeys);
    exportedPackagesZip.addFile(
      BatchExportImportConstants.STUDIO_FILE_NAME,
      Buffer.from(stringify(studioData), "utf8"),
    );

    exportedPackagesZip.getEntries().forEach(entry => {
      if (entry.name.endsWith(BatchExportImportConstants.ZIP_EXTENSION)) {
        const lastUnderscoreIndex = entry.name.lastIndexOf("_");
        const packageKey = entry.name.substring(0, lastUnderscoreIndex);

        if (studioPackageKeys.includes(packageKey)) {
          const updatedPackage = this.studioService.processPackageForExport(
            entry,
            exportedVariables,
          );
          exportedPackagesZip.updateFile(entry, updatedPackage.toBuffer());
        }
      }
    });

    if (gitBranch) {
      const extractedDirectory =
        fileService.extractExportedZipWithNestedZips(exportedPackagesZip);
      await this.gitService.pushToBranch(extractedDirectory, gitBranch);
      logger.info("Successfully exported packages to branch: " + gitBranch);
      fs.rmSync(extractedDirectory, { recursive: true });
    } else {
      this.downloadZip(exportedPackagesZip, unzip);
    }
  }

  public async batchExportPackagesMetadata(
    packageKeys: string[],
    jsonResponse: boolean,
  ): Promise<void> {
    const exportedPackagesMetadata: PackageMetadataExportTransport[] =
      await this.batchImportExportApi.batchExportPackagesMetadata(packageKeys);

    if (jsonResponse) {
      this.exportListOfPackagesMetadata(exportedPackagesMetadata);
    } else {
      exportedPackagesMetadata.forEach(pkg => {
        logger.info(
          `${pkg.key} - Has Unpublished Changes: ${pkg.hasUnpublishedChanges}`,
        );
      });
    }
  }

  public async batchImportPackages(
    sourcePath: string,
    overwrite: boolean,
    gitBranch: string,
  ): Promise<void> {
    let sourceToBeImported: string;
    if (gitBranch) {
      sourceToBeImported = await this.gitService.pullFromBranch(gitBranch);
    } else {
      sourceToBeImported = sourcePath;
    }
    if (fileService.isDirectory(sourceToBeImported)) {
      sourceToBeImported =
        fileService.zipDirectoryInBatchExportFormat(sourceToBeImported);
    }

    let configs = new AdmZip(sourceToBeImported);
    const studioManifests = this.parseEntryData(
      configs,
      BatchExportImportConstants.STUDIO_FILE_NAME,
    ) as StudioPackageManifest[];
    const variablesManifests: VariableManifestTransport[] = this.parseEntryData(
      configs,
      BatchExportImportConstants.VARIABLES_FILE_NAME,
    ) as VariableManifestTransport[];

    configs = await this.studioService.mapSpaces(configs, studioManifests);
    const existingStudioPackages =
      await this.studioPackageApi.findAllPackages();

    const formData = this.buildBodyForImport(configs, variablesManifests);
    const postPackageImportData =
      await this.batchImportExportApi.importPackages(formData, overwrite);
    await this.studioService.processImportedPackages(
      configs,
      existingStudioPackages,
      studioManifests,
    );

    if (gitBranch) {
      fs.rmSync(sourceToBeImported);
    }

    const reportFileName = "config_import_report_" + uuidv4() + ".json";
    fileService.writeToFileWithGivenName(
      JSON.stringify(postPackageImportData),
      reportFileName,
    );
    logger.info("Config import report file: " + reportFileName);
  }

  public async findAndExportListOfActivePackagesByVariableValue(
    flavors: string[],
    variableValue: string,
    variableType: string,
  ): Promise<void> {
    let packagesToExport =
      await this.batchImportExportApi.findActivePackagesByVariableValue(
        flavors,
        variableValue,
        variableType,
      );

    packagesToExport = await this.studioService.getExportPackagesWithStudioData(
      packagesToExport,
      false,
    );

    this.exportListOfPackages(packagesToExport);
  }

  public async listActivePackagesByVariableValue(
    flavors: string[],
    variableValue: string,
    variableType: string,
  ): Promise<void> {
    const packagesByVariableValue =
      await this.batchImportExportApi.findActivePackagesByVariableValue(
        flavors,
        variableValue,
        variableType,
      );
    packagesByVariableValue.forEach(pkg => {
      logger.info(`${pkg.name} - Key: "${pkg.key}"`);
    });
  }

  private exportListOfPackages(packages: PackageExportTransport[]): void {
    const filename = uuidv4() + ".json";
    fileService.writeToFileWithGivenName(JSON.stringify(packages), filename);
    logger.info(FileService.fileDownloadedMessage + filename);
  }

  private getVersionsByPackageKey(
    manifests: PackageManifestTransport[],
  ): Map<string, string[]> {
    const versionsByPackageKey = new Map<string, string[]>();
    manifests.forEach(packageManifest => {
      versionsByPackageKey.set(
        packageManifest.packageKey,
        Object.keys(packageManifest.dependenciesByVersion),
      );
    });

    return versionsByPackageKey;
  }

  private getVersionedVariablesForPackagesWithKeys(
    versionsByPackageKey: Map<string, string[]>,
  ): Promise<VariableManifestTransport[]> {
    const variableExportRequest: PackageKeyAndVersionPair[] = [];
    versionsByPackageKey?.forEach((versions, key) => {
      versions?.forEach(version => {
        variableExportRequest.push({
          packageKey: key,
          version: version,
        });
      });
    });

    return this.batchImportExportApi.findVariablesWithValuesByPackageKeysAndVersion(
      variableExportRequest,
    );
  }

  private exportListOfPackagesMetadata(
    packagesMetadata: PackageMetadataExportTransport[],
  ): void {
    const filename = uuidv4() + ".json";
    fileService.writeToFileWithGivenName(
      JSON.stringify(packagesMetadata),
      filename,
    );
    logger.info(FileService.fileDownloadedMessage + filename);
  }

  private buildBodyForImport(
    configs: AdmZip,
    variablesManifests: VariableManifestTransport[],
  ): FormData {
    const formData = new FormData();
    const readableStream = this.getReadableStream(configs);

    formData.append("file", readableStream, { filename: "configs.zip" });

    if (variablesManifests) {
      formData.append("mappedVariables", JSON.stringify(variablesManifests), {
        contentType: "application/json",
      });
    }

    return formData;
  }

  private getReadableStream(configs: AdmZip): Readable {
    return new Readable({
      read(): void {
        this.push(configs.toBuffer());
        this.push(null);
      },
    });
  }

  private parseEntryData(configs: AdmZip, fileName: string): any {
    const entry = configs.getEntry(fileName);
    if (entry) {
      return parse(entry.getData().toString());
    }
    return null;
  }

  private downloadZip(exportedZip: AdmZip, unzip: boolean): void {
    if (unzip) {
      const fileDownloadedMessage =
        "Successful download. Downloaded directory: ";
      const targetDirectoryName = `export_${uuidv4()}`;
      fileService.extractExportedZipWithNestedZipsToDir(
        exportedZip,
        targetDirectoryName,
      );
      logger.info(fileDownloadedMessage + targetDirectoryName);
    } else {
      const fileDownloadedMessage =
        "File downloaded successfully. New filename: ";
      const filename = `export_${uuidv4()}.zip`;
      exportedZip.writeZip(filename);
      logger.info(fileDownloadedMessage + filename);
    }
  }
}
