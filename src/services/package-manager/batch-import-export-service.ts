import {batchImportExportApi} from "../../api/batch-import-export-api";
import {logger} from "../../util/logger";
import {v4 as uuidv4} from "uuid";
import {
    PackageExportTransport,
    PackageManifestTransport,
    VariableManifestTransport
} from "../../interfaces/package-export-transport";
import {FileService, fileService} from "../file-service";
import {studioService} from "../studio/studio.service";
import {parse, stringify} from "../../util/yaml"
import AdmZip = require("adm-zip");

class BatchImportExportService {

    public async listActivePackages(flavors: string[]): Promise<void> {
        const activePackages = await batchImportExportApi.findAllActivePackages(flavors);
        activePackages.forEach(pkg => {
            logger.info(`${pkg.name} - Key: "${pkg.key}"`)
        });
    }

    public async findAndExportListOfActivePackages(flavors: string[], packageKeys: string[], withDependencies: boolean): Promise<void> {
        let packagesToExport: PackageExportTransport[];

        if (packageKeys.length) {
            packagesToExport = await batchImportExportApi.findActivePackagesByKeys(packageKeys, withDependencies);
        } else  {
            packagesToExport = await batchImportExportApi.findAllActivePackages(flavors, withDependencies);
        }

        packagesToExport = await studioService.getExportPackagesWithStudioData(packagesToExport, withDependencies);

        this.exportListOfPackages(packagesToExport);
    }

    public async batchExportPackages(packageKeys: string[], withDependencies: boolean = false): Promise<void> {
        const exportedPackagesData: Buffer = await batchImportExportApi.exportPackages(packageKeys, withDependencies);
        const exportedPackagesZip: AdmZip = new AdmZip(exportedPackagesData);

        const manifest: PackageManifestTransport[] = parse(
            exportedPackagesZip.getEntry("manifest.yml").getData().toString()
        );

        const versionsByPackageKey = this.getVersionsByPackageKey(manifest);

        let exportedVariables = await this.getVersionedVariablesForPackagesWithKeys(versionsByPackageKey);
        exportedVariables = studioService.fixConnectionVariables(exportedVariables);
        exportedPackagesZip.addFile("variables.yml", Buffer.from(stringify(exportedVariables), "utf8"));

        const studioData = await studioService.getStudioPackageManifests(manifest);
        exportedPackagesZip.addFile("studio.yml", Buffer.from(stringify(studioData), "utf8"));

        exportedPackagesZip.getEntries().forEach(entry => {
            if (entry.name.endsWith(".zip")) {
                const updatedPackage = studioService.processPackageForExport(entry, exportedVariables);

                exportedPackagesZip.updateFile(entry, updatedPackage.toBuffer());
            }
        });

        const fileDownloadedMessage = "File downloaded successfully. New filename: ";
        const filename = `export_${uuidv4()}.zip`;
        exportedPackagesZip.writeZip(filename);
        logger.info(fileDownloadedMessage + filename);
    }

    private exportListOfPackages(packages: PackageExportTransport[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(packages), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }

    private getVersionsByPackageKey(manifests: PackageManifestTransport[]): Map<string, string[]> {
        const versionsByPackageKey = new Map<string, string[]>();
        manifests.forEach(packageManifest => {
            Object.keys(packageManifest.dependenciesByVersion).forEach(version => {
                this.addVersionForPackageKey(packageManifest.packageKey, version, versionsByPackageKey);

                const dependenciesByVersion = packageManifest.dependenciesByVersion[version];
                dependenciesByVersion.forEach(dependency => {
                    this.addVersionForPackageKey(dependency.key, dependency.version, versionsByPackageKey);
                })
            });
        })

        return versionsByPackageKey;
    }

    private addVersionForPackageKey(key: string, version: string, versionsByPackageKey: Map<string, string[]>): void {
        if (versionsByPackageKey.has(key)) {
            if (!versionsByPackageKey.get(key).includes(version)) {
                versionsByPackageKey.get(key).push(version);
            }
        } else {
            versionsByPackageKey.set(key, [version]);
        }
    }

    private getVersionedVariablesForPackagesWithKeys(versionsByPackageKey: Map<string, string[]>): Promise<VariableManifestTransport[]> {
        const variableExportRequest: VariableManifestTransport[] = [];
        versionsByPackageKey?.forEach((versions, key) => {
            versions?.forEach(version => {
                variableExportRequest.push({
                    packageKey: key,
                    version: version,
                })
            })
        });

        return batchImportExportApi.findVariablesWithValuesByPackageKeysAndVersion(variableExportRequest)
    }
}

export const batchImportExportService = new BatchImportExportService();