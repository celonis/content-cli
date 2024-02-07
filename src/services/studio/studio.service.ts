import {
    NodeExportTransport,
    NodeSerializedContent,
    PackageExportTransport,
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
import {spaceApi} from "../../api/space-api";
import {SpaceTransport} from "../../interfaces/save-space.interface";
import {spaceService} from "../package-manager/space-service";
import {variableService} from "../package-manager/variable-service";
import {BatchExportImportConstants} from "../../interfaces/batch-export-import-constants";

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

    public async getStudioPackageManifests(studioPackageKeys: string[]): Promise<StudioPackageManifest[]> {
        return Promise.all(studioPackageKeys.map(async packageKey => {
            const node = await nodeApi.findOneByKeyAndRootNodeKey(packageKey, packageKey);
            const nodeSpace: SpaceTransport = await spaceApi.findOne(node.spaceId);
            const variableAssignments = await variablesApi.getRuntimeVariableValues(packageKey);

            return {
                packageKey: packageKey,
                space: {
                    name: nodeSpace.name,
                    iconReference: nodeSpace.iconReference
                },
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

    public async processImportedPackages(configs: AdmZip): Promise<void> {
        const studioFile = configs.getEntry(BatchExportImportConstants.STUDIO_FILE_NAME);

        if (studioFile) {
            const studioManifests: StudioPackageManifest[] = parse(configs.getEntry(BatchExportImportConstants.STUDIO_FILE_NAME).getData().toString());

            await Promise.all(studioManifests.map(async manifest => {
                await this.movePackageToSpace(manifest);
                await this.assignRuntimeVariables(manifest);
            }));
        }
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

    private async movePackageToSpace(manifest: StudioPackageManifest): Promise<void> {
        const nodeInTargetTeam = await nodeApi.findOneByKeyAndRootNodeKey(manifest.packageKey, manifest.packageKey);

        let targetSpace;
        const allSpaces = await spaceService.refreshAndGetAllSpaces();

        if (manifest.space.id) {
            const customSpace = allSpaces.find(space => space.id === manifest.space.id);

            if (!customSpace) {
                throw Error("Provided space id does not exist.");
            }

            targetSpace = customSpace;
        } else {
            targetSpace = allSpaces.find(space => space.name === manifest.space.name);
            if (!targetSpace) {
                targetSpace = await spaceService.createSpace(manifest.space.name, manifest.space.iconReference);
            }
        }

        await packageApi.movePackageToSpace(nodeInTargetTeam.id, targetSpace.id);
    }

    private async assignRuntimeVariables(manifest: StudioPackageManifest): Promise<void> {
        if (manifest.runtimeVariableAssignments.length) {
            await variableService.assignVariableValues(manifest.packageKey, manifest.runtimeVariableAssignments);
        }
    }
}

export const studioService = new StudioService();