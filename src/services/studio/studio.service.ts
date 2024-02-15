import {
    NodeExportTransport,
    NodeSerializedContent,
    PackageExportTransport,
    PackageKeyAndVersionPair,
    StudioPackageManifest,
    VariableExportTransport,
    VariableManifestTransport
} from "../../interfaces/package-export-transport";

import {packageApi} from "../../api/package-api";
import {
    ContentNodeTransport,
    PackageManagerVariableType,
    PackageWithVariableAssignments,
    StudioComputeNodeDescriptor
} from "../../interfaces/package-manager.interfaces";
import {dataModelService} from "../package-manager/datamodel-service";
import {IZipEntry} from "adm-zip";
import {parse, stringify} from "../../util/yaml";
import {nodeApi} from "../../api/node-api";
import {variablesApi} from "../../api/variables-api";
import {spaceApi} from "../../api/space-api";
import {SpaceTransport} from "../../interfaces/save-space.interface";
import {spaceService} from "../package-manager/space-service";
import {variableService} from "../package-manager/variable-service";
import {BatchExportImportConstants} from "../../interfaces/batch-export-import-constants";
import AdmZip = require("adm-zip");


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
            const variableAssignments = await variablesApi.getRuntimeVariableValues(packageKey, BatchExportImportConstants.APP_MODE_VIEWER);

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
        this.deleteScenarioAssets(packageZip);
        this.fixConnectionVariablesForRootNodeFiles(packageZip, exportedPackage.name, exportedVariables);

        return packageZip;
    }

    public async processImportedPackages(configs: AdmZip, existingStudioPackages: ContentNodeTransport[], studioManifests: StudioPackageManifest[]): Promise<void> {
            for (const  manifest of studioManifests) {
                // add only for existing ones
                const nodeInTargetTeam = await nodeApi.findOneByKeyAndRootNodeKey(manifest.packageKey, manifest.packageKey);
                await packageApi.movePackageToSpace(nodeInTargetTeam.id, manifest.space.id);
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

    private deleteScenarioAssets(packageZip: AdmZip): void {
        packageZip.getEntries().filter(entry => entry.entryName.startsWith("nodes/") && entry.entryName.endsWith(".yml"))
            .forEach(entry => {
                const node: NodeExportTransport = parse(entry.getData().toString());
                if (node.type === "SCENARIO") {
                    packageZip.deleteFile(entry);
                }
            });
    }

    private fixConnectionVariablesForRootNodeFiles(packageZip: AdmZip, zipName: string, exportedVariables: VariableManifestTransport[]): void {
        const packageKeyAndVersion = this.getPackageKeyAndVersion(zipName);

        const connectionVariablesByKey = this.getConnectionVariablesByKeyForPackage(packageKeyAndVersion.packageKey, packageKeyAndVersion.version, exportedVariables);

        if (connectionVariablesByKey.size === 0) {
            return;
        }

        const packageEntry = packageZip.getEntry("package.yml");

        const exportedNode: NodeExportTransport = parse(packageEntry.getData().toString());
        const nodeContent: NodeSerializedContent = parse(exportedNode.serializedContent);

        nodeContent.variables = nodeContent.variables.map(variable => ({
            ...variable,
            metadata: variable.type === PackageManagerVariableType.CONNECTION ?
                connectionVariablesByKey.get(variable.key).metadata : variable.metadata
        }));

        exportedNode.serializedContent = stringify(nodeContent);
        packageZip.updateFile(packageEntry, Buffer.from(stringify(exportedNode)));
    }

    private getPackageKeyAndVersion(zipName: string): PackageKeyAndVersionPair {
        const lastUnderscoreIndex = zipName.lastIndexOf("_");
        const packageKey = zipName.replace(".zip", "").substring(0, lastUnderscoreIndex);
        const packageVersion = zipName.replace(".zip", "").substring(lastUnderscoreIndex + 1);

        return {
            packageKey: packageKey,
            version: packageVersion
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

        const allSpaces = await spaceService.refreshAndGetAllSpaces();
        let targetSpace = allSpaces.find(space => space.name === manifest.space.name);

        if (!targetSpace) {
            targetSpace = await spaceService.createSpace(manifest.space.name, manifest.space.iconReference);
        }

        await packageApi.movePackageToSpace(nodeInTargetTeam.id, targetSpace.id);
    }

    // tslint:disable-next-line:typedef
    public async mapSpaces(exportedFiles: AdmZip, studioManifests: StudioPackageManifest[]) {
        console.log("mapping spaces ", studioManifests)

            for (const entry of exportedFiles.getEntries()) {
                const packageKey = entry.name.split("_")[0];
                if (entry.name.endsWith(".zip") && this.isStudioPackage(studioManifests, packageKey)) {
                    const studioManifest = studioManifests.find(manifest => manifest.packageKey === packageKey);
                    const spaceId =  await this.getMappedOrFindSpaceIdForPackage(packageKey, studioManifests);
                    studioManifest.space.id = spaceId;

                    const packageZip = new AdmZip(entry.getData());
                    console.log("entries", packageZip.getEntries().length)
                    packageZip.getEntries().forEach(entry => {
                        if(entry.entryName.endsWith("yml")) {
                            const updatedNodeFile = this.updateSpaceIdForNode(entry, spaceId);
                            // console.log("node-i", updatedNodeFile)
                            packageZip.updateFile(entry, Buffer.from(stringify(updatedNodeFile)));
                        }
                    });
                    exportedFiles.updateFile(entry.entryName, packageZip.toBuffer());
                }

        }
        return exportedFiles;
    }

    private isStudioPackage(studioManifests: StudioPackageManifest[], packageKey: string): boolean {
        return studioManifests.some(manifest => manifest.packageKey === packageKey);
    }

    private async getMappedOrFindSpaceIdForPackage(packageKey: string, studioPackageManifestList: StudioPackageManifest[]): Promise<string> {
        const studioPackageManifest = studioPackageManifestList.find(manifest => manifest.packageKey === packageKey);
        const allSpaces = await spaceService.refreshAndGetAllSpaces();
        console.log("studioPackageManifest ", studioPackageManifest)

        if (studioPackageManifest) {
            console.log("studioPackageManifest ", true)
            console.log(studioPackageManifest)
            if(studioPackageManifest.space.id) {
                console.log("Found mapped space id ", studioPackageManifest.space.id)
                const targetSpace = allSpaces.find(space => space.id === studioPackageManifest.space.id);
                if (!targetSpace) {
                    throw Error("Provided space ID does not exist.");
                }
                return targetSpace.id;
            }

            const targetSpaceByName = allSpaces.find(space => space.name === studioPackageManifest.space.name);
            if(targetSpaceByName) {
                console.log("Found space by name ", targetSpaceByName.id, targetSpaceByName.name)
                return targetSpaceByName.id;
            }

            const spaceTransport = await spaceService.createSpace(studioPackageManifest.space.name, studioPackageManifest.space.iconReference);
            console.log("Created space by name ", targetSpaceByName.id, targetSpaceByName.name)
            return spaceTransport.id;
        }
    }

    private async assignRuntimeVariables(manifest: StudioPackageManifest): Promise<void> {
        if (manifest.runtimeVariableAssignments.length) {
            await variableService.assignVariableValues(manifest.packageKey, manifest.runtimeVariableAssignments);
        }
    }

    // tslint:disable-next-line:typedef
    private updateSpaceIdForNode(entry: AdmZip.IZipEntry, spaceId: string) {
        console.log("contenti \n", entry.getData().toString());

        const exportedNode: NodeExportTransport = parse(entry.getData().toString());
        // @ts-ignore
        const oldSpaceId = exportedNode.unversionedMetadata.spaceId;
        console.log("Old space id",oldSpaceId)
        console.log("New space id",spaceId)

        let content  = entry.getData().toString();
        content = content.replaceAll(oldSpaceId, spaceId);
        console.log("contenti updated \n", content);
        // @ts-ignore
        return content;
    }
}

export const studioService = new StudioService();