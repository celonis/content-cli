import {
    NodeExportTransport, NodeSerializedContent,
    PackageExportTransport,
    PackageManifestTransport, StudioPackageManifest, VariableExportTransport,
    VariableManifestTransport
} from "../../interfaces/package-export-transport";
import {packageApi} from "../../api/package-api";
import {
    PackageManagerVariableType,
    PackageWithVariableAssignments,
    StudioComputeNodeDescriptor
} from "../../interfaces/package-manager.interfaces";
import {dataModelService} from "../package-manager/datamodel-service";
import AdmZip = require("adm-zip");
import {IZipEntry} from "adm-zip";
import {parse, stringify} from "../../util/yaml";

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
        const studioManifests = [];
        const exportedPackageKeys = manifests.map(exportedPackage => exportedPackage.packageKey);

        const packageWithVariableAssignmentsByKey = await packageApi.findAllPackagesWithVariableAssignments(PackageManagerVariableType.PLAIN_TEXT);
        packageWithVariableAssignmentsByKey.forEach(pkg => {
            if (exportedPackageKeys.includes(pkg.key)) {
                studioManifests.push({
                    packageKey: pkg.key,
                    spaceId: pkg.spaceId,
                    runtimeVariableAssignments: pkg.variableAssignments
                })
            }
        });

        return studioManifests;
    }

    public getPackageWithoutActionFlowsAndFixConnectionVariables(exportedPackage: IZipEntry, exportedVariables: VariableManifestTransport[]): AdmZip {
        const packageZip = new AdmZip(exportedPackage.getData());
        packageZip.getEntries().forEach(entry => {
            if (entry.entryName.startsWith("nodes/") && entry.entryName.endsWith(".yml")) {
                const node: NodeExportTransport = parse(entry.getData().toString());
                if (node.type === "SCENARIO") {
                    packageZip.deleteFile(entry);
                }
            }

            if (entry.name === "package.yml") {
                const packageKeyAndVersion = exportedPackage.name.replace(".zip", "").split("_");
                const connectionVariables = this.getConnectionVariablesForPackage(packageKeyAndVersion[0], packageKeyAndVersion[1], exportedVariables);

                if (connectionVariables.length) {
                    const variableValuesByKey = new Map<string, VariableExportTransport>();
                    connectionVariables.forEach(variable => variableValuesByKey.set(variable.key, variable));

                    const exportedNode: NodeExportTransport = parse(entry.getData().toString());
                    const nodeContent: NodeSerializedContent = parse(exportedNode.serializedContent);

                    nodeContent.variables = nodeContent.variables.map(variable => {
                        if (variable.type === PackageManagerVariableType.CONNECTION) {
                            variable = {
                                ...variable,
                                metadata: variableValuesByKey.get(variable.key).metadata
                            }
                        }

                        return variable;
                    })

                    exportedNode.serializedContent = stringify(nodeContent);
                    packageZip.updateFile(entry, Buffer.from(stringify(exportedNode)));
                }
            }
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

    private getConnectionVariablesForPackage(packageKey: string, packageVersion: string, variables: VariableManifestTransport[]): VariableExportTransport[] {
        const packageVariables = variables.find(exportedVariable => exportedVariable.packageKey === packageKey && exportedVariable.version === packageVersion);

        if (packageVariables.variables.length) {
            return packageVariables.variables.filter(variable => variable.type === PackageManagerVariableType.CONNECTION);
        }

        return [];
    }
}

export const studioService = new StudioService();