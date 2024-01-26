import {
    NodeExportTransport,
    NodeSerializedContent,
    PackageExportTransport,
    PackageManifestTransport,
    StudioPackageManifest,
    VariableExportTransport,
    VariableManifestTransport
} from "../../interfaces/package-export-transport";
import {packageApi} from "../../api/package-api";
import {
    PackageManagerVariableType,
    PackageWithVariableAssignments,
    StudioComputeNodeDescriptor
} from "../../interfaces/package-manager.interfaces";
import {dataModelService} from "../package-manager/datamodel-service";
import {IZipEntry} from "adm-zip";
import {parse, stringify} from "../../util/yaml";
import AdmZip = require("adm-zip");
import {nodeApi} from "../../api/node-api";
import {variablesApi} from "../../api/variables-api";

class StudioService {

    public async getExportPackagesWithStudioData(packagesToExport: PackageExportTransport[], withDependencies: boolean): Promise<PackageExportTransport[]> {
        const studioPackagesWithDataModels = await packageApi.findAllPackagesWithVariableAssignments(PackageManagerVariableType.DATA_MODEL);

        packagesToExport = studioService.setSpaceIdForStudioPackages(packagesToExport, studioPackagesWithDataModels);

        if (withDependencies) {
            const dataModelDetailsByNode = await dataModelService.getDataModelDetailsForPackages(studioPackagesWithDataModels);
            packagesToExport = studioService.setDataModelsForStudioPackages(packagesToExport, studioPackagesWithDataModels, dataModelDetailsByNode);
        }

        return packagesToExport;
    }

    public fixConnectionVariables(variables: VariableManifestTransport[]): VariableManifestTransport[] {
        return variables.map(variableManifest => ({
            ...variableManifest,
            variables: variableManifest.variables.map(variable => ({
                ...variable,
                metadata: variable.type === PackageManagerVariableType.CONNECTION ? {
                    ...variable.metadata,
                    appName: variable.value["appName"] || ""
                } : {
                    ...variable.metadata
                }
            }))
        }));
    }

    public async getStudioPackageManifests(manifests: PackageManifestTransport[]): Promise<StudioPackageManifest[]> {
        const exportedStudioPackageKeys = manifests
            .filter(manifest => manifest.flavor === "STUDIO")
            .map(exportedPackage => exportedPackage.packageKey);

        return Promise.all(exportedStudioPackageKeys.map(async packageKey => {
            const node = await nodeApi.findOneByKeyAndRootNodeKey(packageKey, packageKey);
            const variableAssignments = await variablesApi.getRuntimeVariableValues(packageKey);

            return {
                packageKey: packageKey,
                spaceId: node.spaceId,
                runtimeVariableAssignments: variableAssignments
            }
        }));
    }

    public processPackageForExport(exportedPackage: IZipEntry, exportedVariables: VariableManifestTransport[]): AdmZip {
        const packageZip = new AdmZip(exportedPackage.getData());
        packageZip.getEntries().forEach(entry => {
            this.deleteFileIfTypeScenario(packageZip, entry);
            this.fixConnectionVariablesIfRootNodeFile(packageZip, entry, exportedPackage.name, exportedVariables);
        });

        return packageZip;
    }

    private setSpaceIdForStudioPackages(packages: PackageExportTransport[], studioPackages: PackageWithVariableAssignments[]): PackageExportTransport[] {
        const studioPackageByKey = new Map<string, PackageWithVariableAssignments>();
        studioPackages.forEach(pkg => studioPackageByKey.set(pkg.key, pkg));

        return packages.map(pkg => {
            return studioPackageByKey.has(pkg.key) ? {
                ...pkg,
                spaceId: studioPackageByKey.get(pkg.key).spaceId
            } : pkg;
        });
    }

    private setDataModelsForStudioPackages(packages: PackageExportTransport[],
                                                 studioPackageWithDataModels: PackageWithVariableAssignments[],
                                                 dataModelDetailsByNode: Map<string, StudioComputeNodeDescriptor[]>): PackageExportTransport[] {
        const studioPackageByKey = new Map<string, PackageWithVariableAssignments>();
        studioPackageWithDataModels.forEach(pkg => studioPackageByKey.set(pkg.key, pkg));

        return packages.map(pkg => {
            return studioPackageByKey.has(pkg.key) ? {
                ...pkg,
                datamodels: dataModelDetailsByNode.get(pkg.key)
                            .map(dataModel => ({
                                name: dataModel.name,
                                poolId: dataModel.poolId,
                                dataModelId: dataModel.dataModelId
                            }))
            } : pkg;
        });
    }

    private deleteFileIfTypeScenario(packageZip: AdmZip, entry: IZipEntry): void {
        if (entry.entryName.startsWith("nodes/") && entry.entryName.endsWith(".yml")) {
            const node: NodeExportTransport = parse(entry.getData().toString());
            if (node.type === "SCENARIO") {
                packageZip.deleteFile(entry);
            }
        }
    }

    private fixConnectionVariablesIfRootNodeFile(packageZip: AdmZip, entry: IZipEntry, zipName: string, exportedVariables: VariableManifestTransport[]): void {
        if (entry.name === "package.yml") {
            const packageKeyAndVersion = zipName.replace(".zip", "").split("_");
            const connectionVariablesByKey = this.getConnectionVariablesByKeyForPackage(packageKeyAndVersion[0], packageKeyAndVersion[1], exportedVariables);

            if (connectionVariablesByKey.size) {
                const exportedNode: NodeExportTransport = parse(entry.getData().toString());
                const nodeContent: NodeSerializedContent = parse(exportedNode.serializedContent);

                nodeContent.variables = nodeContent.variables.map(variable => ({
                    ...variable,
                    metadata: variable.type === PackageManagerVariableType.CONNECTION ?
                        connectionVariablesByKey.get(variable.key).metadata : variable.metadata
                }));

                exportedNode.serializedContent = stringify(nodeContent);
                packageZip.updateFile(entry, Buffer.from(stringify(exportedNode)));
            }
        }
    }

    private getConnectionVariablesByKeyForPackage(packageKey: string, packageVersion: string, variables: VariableManifestTransport[]): Map<string, VariableExportTransport> {
        const variablesByKey = new Map<string, VariableExportTransport>();
        const packageVariables = variables.find(exportedVariable => exportedVariable.packageKey === packageKey && exportedVariable.version === packageVersion);

        if (packageVariables && packageVariables.variables.length) {
            packageVariables.variables.filter(variable => variable.type === PackageManagerVariableType.CONNECTION)
                .forEach(variable => variablesByKey.set(variable.key, variable));
        }

        return variablesByKey;
    }
}

export const studioService = new StudioService();