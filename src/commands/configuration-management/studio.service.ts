import {IZipEntry} from "adm-zip";
import * as AdmZip from "adm-zip";
import {
    NodeConfiguration,
    NodeExportTransport,
    PackageExportTransport,
    PackageKeyAndVersionPair,
    StudioPackageManifest,
    VariableExportTransport,
    VariableManifestTransport,
} from "./interfaces/package-export.interfaces";
import {
    ContentNodeTransport,
    PackageManagerVariableType,
    PackageWithVariableAssignments,
    StudioComputeNodeDescriptor,
} from "../studio/interfaces/package-manager.interfaces";
import {BatchExportImportConstants} from "./interfaces/batch-export-import.constants";
import {SpaceTransport} from "../studio/interfaces/space.interface";
import {parse, stringify} from "../../core/utils/json";
import {Context} from "../../core/command/cli-context";
import {PackageApi} from "../studio/api/package-api";
import {DataModelService} from "../studio/service/data-model.service";
import {NodeApi} from "../studio/api/node-api";
import {SpaceApi} from "../studio/api/space-api";
import {StudioVariablesApi} from "../studio/api/studio-variables-api";
import {SpaceService} from "../studio/service/space.service";
import {StudioVariableService} from "../studio/service/studio-variable.service";

export class StudioService {
    private studioPackageApi: PackageApi;
    private studioNodeApi: NodeApi;
    private studioSpaceApi: SpaceApi;
    private studioVariablesApi: StudioVariablesApi;

    private studioDataModelService: DataModelService;
    private studioSpaceService: SpaceService;
    private studioVariableService: StudioVariableService;

    constructor(context: Context) {
        this.studioPackageApi = new PackageApi(context);
        this.studioNodeApi = new NodeApi(context);
        this.studioSpaceApi = new SpaceApi(context);
        this.studioVariablesApi = new StudioVariablesApi(context);

        this.studioDataModelService = new DataModelService(context);
        this.studioSpaceService = new SpaceService(context);
        this.studioVariableService = new StudioVariableService(context);
    }

    public async getExportPackagesWithStudioData(
        packagesToExport: PackageExportTransport[],
        withDependencies: boolean
    ): Promise<PackageExportTransport[]> {
        const studioPackagesWithDataModels = await this.studioPackageApi.findAllPackagesWithVariableAssignments(
            PackageManagerVariableType.DATA_MODEL
        );

        packagesToExport = this.setSpaceIdForStudioPackages(packagesToExport, studioPackagesWithDataModels);

        if (withDependencies) {
            const dataModelDetailsByNode =
                await this.studioDataModelService.getDataModelDetailsForPackages(studioPackagesWithDataModels);
            packagesToExport = this.setDataModelsForStudioPackages(
                packagesToExport,
                studioPackagesWithDataModels,
                dataModelDetailsByNode
            );
        }

        return packagesToExport;
    }

    public fixConnectionVariables(variables: VariableManifestTransport[]): VariableManifestTransport[] {
        return variables.map(variableManifest => ({
            ...variableManifest,
            variables: variableManifest.variables.map(variable => {
                if (variable.type !== PackageManagerVariableType.CONNECTION) {
                    return variable;
                }

                return this.fixConnectionVariable(variable);
            }),
        }));
    }

    public async getStudioPackageManifests(studioPackageKeys: string[]): Promise<StudioPackageManifest[]> {
        return Promise.all(
            studioPackageKeys.map(async packageKey => {
                const node = await this.studioNodeApi.findOneByKeyAndRootNodeKey(packageKey, packageKey);
                const nodeSpace: SpaceTransport = await this.studioSpaceApi.findOne(node.spaceId);
                const variableAssignments = await this.studioVariablesApi.getRuntimeVariableValues(
                    packageKey,
                    BatchExportImportConstants.APP_MODE_VIEWER
                );

                return {
                    packageKey: packageKey,
                    space: {
                        name: nodeSpace.name,
                        iconReference: nodeSpace.iconReference,
                    },
                    runtimeVariableAssignments: variableAssignments,
                };
            })
        );
    }

    public processPackageForExport(exportedPackage: IZipEntry, exportedVariables: VariableManifestTransport[]): AdmZip {
        const packageZip = new AdmZip(exportedPackage.getData());
        this.deleteScenarioAssets(packageZip);
        this.fixConnectionVariablesForRootNodeFiles(packageZip, exportedPackage.name, exportedVariables);

        return packageZip;
    }

    public async processImportedPackages(
        configs: AdmZip,
        existingStudioPackages: ContentNodeTransport[],
        studioManifests: StudioPackageManifest[]
    ): Promise<void> {
        if (studioManifests == null) {
            return;
        }
        for (const manifest of studioManifests) {
            const existingPackage = existingStudioPackages.find(
                existingPackage => existingPackage.key === manifest.packageKey
            );
            if (existingPackage) {
                await this.studioPackageApi.movePackageToSpace(existingPackage.id, manifest.space.id);
            }
            await this.assignRuntimeVariables(manifest);
        }
    }

    private setSpaceIdForStudioPackages(
        packages: PackageExportTransport[],
        studioPackages: PackageWithVariableAssignments[]
    ): PackageExportTransport[] {
        const studioPackageByKey = new Map<string, PackageWithVariableAssignments>();
        studioPackages.forEach(pkg => studioPackageByKey.set(pkg.key, pkg));

        return packages.map(pkg => {
            return studioPackageByKey.has(pkg.key)
                ? {
                      ...pkg,
                      spaceId: studioPackageByKey.get(pkg.key).spaceId,
                  }
                : pkg;
        });
    }

    private setDataModelsForStudioPackages(
        packages: PackageExportTransport[],
        studioPackageWithDataModels: PackageWithVariableAssignments[],
        dataModelDetailsByNode: Map<string, StudioComputeNodeDescriptor[]>
    ): PackageExportTransport[] {
        const studioPackageByKey = new Map<string, PackageWithVariableAssignments>();
        studioPackageWithDataModels.forEach(pkg => studioPackageByKey.set(pkg.key, pkg));

        return packages.map(pkg => {
            return studioPackageByKey.has(pkg.key)
                ? {
                      ...pkg,
                      datamodels: dataModelDetailsByNode.get(pkg.key).map(dataModel => ({
                          name: dataModel.name,
                          poolId: dataModel.poolId,
                          dataModelId: dataModel.dataModelId,
                      })),
                  }
                : pkg;
        });
    }

    private fixConnectionVariable(variable: VariableExportTransport): VariableExportTransport {
        if (!variable.value?.appName) {
            return variable;
        }

        return {
            ...variable,
            metadata: {
                ...variable.metadata,
                appName: variable.value.appName,
            },
        };
    }

    private deleteScenarioAssets(packageZip: AdmZip): void {
        packageZip
            .getEntries()
            .filter(
                entry =>
                    entry.entryName.startsWith(BatchExportImportConstants.NODES_FOLDER_NAME) &&
                    entry.entryName.endsWith(BatchExportImportConstants.JSON_EXTENSION)
            )
            .forEach(entry => {
                const node: NodeExportTransport = parse(entry.getData().toString());
                if (node.type === BatchExportImportConstants.SCENARIO_NODE) {
                    packageZip.deleteFile(entry);
                }
            });
    }

    private fixConnectionVariablesForRootNodeFiles(
        packageZip: AdmZip,
        zipName: string,
        exportedVariables: VariableManifestTransport[]
    ): void {
        const packageKeyAndVersion = this.getPackageKeyAndVersion(zipName);
        const connectionVariablesByKey = this.getConnectionVariablesByKeyForPackage(
            packageKeyAndVersion.packageKey,
            packageKeyAndVersion.version,
            exportedVariables
        );

        if (connectionVariablesByKey.size === 0) {
            return;
        }

        const packageEntry = packageZip.getEntry("package.json");

        const exportedNode: NodeExportTransport = parse(packageEntry.getData().toString());
        const nodeContent: NodeConfiguration = exportedNode.configuration;

        nodeContent.variables = nodeContent.variables.map(variable => ({
            ...variable,
            metadata:
                variable.type === PackageManagerVariableType.CONNECTION
                    ? connectionVariablesByKey.get(variable.key).metadata
                    : variable.metadata,
        }));

        packageZip.updateFile(packageEntry, Buffer.from(stringify(exportedNode)));
    }

    private getPackageKeyAndVersion(zipName: string): PackageKeyAndVersionPair {
        const lastUnderscoreIndex = zipName.lastIndexOf("_");
        const packageKey = zipName
            .replace(BatchExportImportConstants.ZIP_EXTENSION, "")
            .substring(0, lastUnderscoreIndex);
        const packageVersion = zipName
            .replace(BatchExportImportConstants.ZIP_EXTENSION, "")
            .substring(lastUnderscoreIndex + 1);

        return {
            packageKey: packageKey,
            version: packageVersion,
        };
    }

    private getConnectionVariablesByKeyForPackage(
        packageKey: string,
        packageVersion: string,
        variables: VariableManifestTransport[]
    ): Map<string, VariableExportTransport> {
        const variablesByKey = new Map<string, VariableExportTransport>();
        const packageVariables = variables.find(
            exportedVariable =>
                exportedVariable.packageKey === packageKey && exportedVariable.version === packageVersion
        );

        if (packageVariables && packageVariables.variables.length) {
            packageVariables.variables
                .filter(variable => variable.type === PackageManagerVariableType.CONNECTION)
                .forEach(variable => variablesByKey.set(variable.key, variable));
        }

        return variablesByKey;
    }

    public async mapSpaces(exportedFiles: AdmZip, studioManifests: StudioPackageManifest[]): Promise<AdmZip> {
        if (studioManifests == null) {
            return exportedFiles;
        }
        for (const file of exportedFiles.getEntries()) {
            if (file.name.endsWith(BatchExportImportConstants.ZIP_EXTENSION)) {
                const packageKey = this.getPackageKeyAndVersion(file.name).packageKey;

                if (this.isStudioPackage(studioManifests, packageKey)) {
                    const studioManifest = studioManifests.find(manifest => manifest.packageKey === packageKey);

                    if (studioManifest) {
                        const spaceId = await this.findDesiredSpaceIdForPackage(studioManifest);
                        studioManifest.space.id = spaceId;

                        const packageZip = new AdmZip(file.getData());
                        packageZip.getEntries().forEach(nodeFile => {
                            if (nodeFile.entryName.endsWith(BatchExportImportConstants.JSON_EXTENSION)) {
                                const updatedNodeFile = this.updateSpaceIdForNode(
                                    nodeFile.getData().toString(),
                                    spaceId
                                );
                                packageZip.updateFile(nodeFile, Buffer.from(updatedNodeFile));
                            }
                        });
                        exportedFiles.updateFile(file, packageZip.toBuffer());
                    }
                }
            }
        }
        return exportedFiles;
    }

    private isStudioPackage(studioManifests: StudioPackageManifest[], packageKey: string): boolean {
        return studioManifests.some(manifest => manifest.packageKey === packageKey);
    }

    private async findDesiredSpaceIdForPackage(studioPackageManifest: StudioPackageManifest): Promise<string> {
        const allSpaces = await this.studioSpaceService.refreshAndGetAllSpaces();

        if (studioPackageManifest.space.id) {
            const targetSpace = allSpaces.find(space => space.id === studioPackageManifest.space.id);
            if (!targetSpace) {
                throw Error("Provided space ID does not exist.");
            }
            return targetSpace.id;
        }

        const targetSpaceByName = allSpaces.find(space => space.name === studioPackageManifest.space.name);
        if (targetSpaceByName) {
            return targetSpaceByName.id;
        }

        const spaceTransport = await this.studioSpaceService.createSpace(
            studioPackageManifest.space.name,
            studioPackageManifest.space.iconReference
        );
        return spaceTransport.id;
    }

    private async assignRuntimeVariables(manifest: StudioPackageManifest): Promise<void> {
        if (manifest.runtimeVariableAssignments.length) {
            await this.studioVariableService.assignVariableValues(
                manifest.packageKey,
                manifest.runtimeVariableAssignments
            );
        }
    }

    private updateSpaceIdForNode(nodeContent: string, spaceId: string): string {
        const exportedNode: NodeExportTransport = parse(nodeContent);
        const oldSpaceId = exportedNode.spaceId;

        nodeContent = nodeContent.replace(new RegExp(oldSpaceId, "g"), spaceId);
        return nodeContent;
    }
}
