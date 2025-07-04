import {v4 as uuidv4} from "uuid";
import * as fs from "fs";
import AdmZip = require("adm-zip");
import * as path from "path";
import {tmpdir} from "os";
import * as FormData from "form-data";
import { Context } from "../../../core/command/cli-context";
import { PackageApi } from "../api/package-api";
import { FatalError, logger } from "../../../core/utils/logger";
import {
    ContentNodeTransport,
    PackageDependencyTransport,
    PackageManagerVariableType,
} from "../interfaces/package-manager.interfaces";
import { DataPoolInstallVersionReport } from "../../data-pipeline/data-pool/data-pool-manager.interfaces";
import { FileService, fileService } from "../../../core/utils/file-service";
import { BatchExportNodeTransport } from "../interfaces/batch-export-node.interfaces";
import { ManifestDependency, ManifestNodeTransport } from "../interfaces/manifest.interface";
import { parse } from "../../../core/utils/yaml";
import { stringify } from "yaml";
import { SemanticVersioning } from "../utils/semantic-versioning";
import { SpaceTransport } from "../interfaces/space.interface";
import { NodeApi } from "../api/node-api";
import { PackageDependenciesApi } from "../api/package-dependencies-api";
import { DataModelService } from "./data-model.service";
import { StudioVariableService } from "./studio-variable.service";
import { SpaceService } from "./space.service";

export class PackageService {
    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    private packageApi: PackageApi;
    private nodeApi: NodeApi;
    private packageDependenciesApi: PackageDependenciesApi;

    private dataModelService: DataModelService;
    private variableService: StudioVariableService;
    private spaceService: SpaceService;

    constructor(context: Context) {
        this.packageApi = new PackageApi(context);
        this.nodeApi = new NodeApi(context);
        this.packageDependenciesApi = new PackageDependenciesApi(context);
        this.dataModelService = new DataModelService(context);
        this.variableService = new StudioVariableService(context);
        this.spaceService = new SpaceService(context);
    }

    public async listPackages(): Promise<void> {
        const nodes = await this.packageApi.findAllPackages();
        nodes.forEach(node => {
            logger.info(`${node.name} - Key: "${node.key}"`);
        });
    }

    public async findAndExportListOfAllPackages(includeDependencies: boolean, packageKeys: string[]): Promise<void> {
        const fieldsToInclude = ["key", "name", "changeDate", "activatedDraftId", "workingDraftId", "spaceId", "id"];

        let nodesListToExport: BatchExportNodeTransport[] = await this.packageApi.findAllPackages();
        if (packageKeys.length > 0) {
            nodesListToExport = nodesListToExport.filter(node => packageKeys.includes(node.rootNodeKey));
        }

        if (includeDependencies) {
            fieldsToInclude.push("type", "value", "dependencies", "updateAvailable", "version", "poolId", "node", "dataModelId", "dataPool", "datamodels");
            const unPublishedNodes = nodesListToExport.filter(node => !node.activatedDraftId);
            let publishedNodes = nodesListToExport.filter(node => node.activatedDraftId);
            publishedNodes = await this.getNodesWithActiveVersion(publishedNodes);
            nodesListToExport = [...publishedNodes, ...unPublishedNodes];

            const packageWithDataModelVariableAssignments = await this.variableService.getVariableAssignmentsForNodes(PackageManagerVariableType.DATA_MODEL);
            const dataModelDetailsByNode = await this.dataModelService.getDataModelDetailsForPackages(packageWithDataModelVariableAssignments);
            nodesListToExport.forEach(node => {
                node.datamodels = dataModelDetailsByNode.get(node.key);
            });

            const draftIdByNodeId = new Map<string, string>();
            nodesListToExport.forEach(node => draftIdByNodeId.set(node.workingDraftId, node.id));

            const dependenciesByPackageIds = await this.getPackagesWithDependencies(draftIdByNodeId);

            nodesListToExport = nodesListToExport.map(nodeToExport => {
                nodeToExport.dependencies = dependenciesByPackageIds[nodeToExport.workingDraftId] ?? [];
                return nodeToExport;
            })
        }
        this.exportListOfPackages(nodesListToExport, fieldsToInclude);
    }

    public async batchImportPackages(spaceMappings: string[], dataModelMappingsFilePath: string, exportedPackagesFile: string, overwrite: boolean, excludeActionFlows: boolean): Promise<void> {
        exportedPackagesFile = exportedPackagesFile + (exportedPackagesFile.includes(".zip") ? "" : ".zip");
        const zip = new AdmZip(exportedPackagesFile);
        const importedFilePath = path.resolve(tmpdir(), "export_" + uuidv4());
        await fs.mkdirSync(importedFilePath);
        await zip.extractAllTo(importedFilePath);

        const manifestNodes = await this.readManifestFile(importedFilePath);

        if (!overwrite) {
            const allTargetPackages = await this.packageApi.findAllPackages();
            const manifestNodeKeys = manifestNodes.map(node => node.packageKey);
            const packagesWithDraftChanges = allTargetPackages
                .filter(node => manifestNodeKeys.includes(node.key) && node.workingDraftId !== node.activatedDraftId)
                .map(node => node.key)
                .join(", ");
            if (!!packagesWithDraftChanges) {
                throw new FatalError(`Failed to import. Cannot overwrite packages with key(s) ${packagesWithDraftChanges}`)
            }
        }

        let dmTargetIdsBySourceIds: Map<string, string> = new Map();
        if (dataModelMappingsFilePath) {
            const dataModelMappings: DataPoolInstallVersionReport = await fileService.readFileToJson<DataPoolInstallVersionReport>(dataModelMappingsFilePath);
            dmTargetIdsBySourceIds = new Map(Object.entries(dataModelMappings.dataModelIdMappings));
        }

        manifestNodes.map(node => node.dependenciesByVersion = new Map(Object.entries(node.dependenciesByVersion)));

        const importedVersionsByNodeKey = new Map<string, string[]>();
        const sourceToTargetVersionsByNodeKey = new Map<string, Map<string, string>>();

        for (const node of manifestNodes) {
            for (const version of node.dependenciesByVersion.keys()) {
                await this.checkNodeForCircularDependency(node, version, manifestNodes, []);
            }
        }

        const customSpacesMap: Map<string, string> = new Map();
        spaceMappings.forEach(spaceMap => {
            const packageAndSpaceid = spaceMap.split(":");
            customSpacesMap.set(packageAndSpaceid[0], packageAndSpaceid[1])
        })

        const draftIdsByPackageKeyAndVersion = new Map<string, string>();
        for (const node of manifestNodes) {
            await this.importPackage(node, manifestNodes, sourceToTargetVersionsByNodeKey, customSpacesMap, dmTargetIdsBySourceIds, importedVersionsByNodeKey, draftIdsByPackageKeyAndVersion, importedFilePath, excludeActionFlows)
        }
    }

    private async checkNodeForCircularDependency(node: ManifestNodeTransport, version: string, manifestNodes: ManifestNodeTransport[], iteratedNodeAndVersions: string[]): Promise<void> {
        const dependencies = node.dependenciesByVersion.get(version);

        if (iteratedNodeAndVersions.includes(`${node.packageKey}_${version}`)) {
            throw new Error("Circular dependency detected!");
        }

        iteratedNodeAndVersions.push(`${node.packageKey}_${version}`);

        for (const dependency of dependencies) {
            const manifestNodeOfDependency = manifestNodes.find(manifestNode => manifestNode.packageKey === dependency.key);

            await this.checkNodeForCircularDependency(manifestNodeOfDependency, dependency.version, manifestNodes, iteratedNodeAndVersions);
        }
    }

    private async importPackage(packageToImport: ManifestNodeTransport,
                                manifestNodes: ManifestNodeTransport[],
                                sourceToTargetVersionsByNodeKey: Map<string, Map<string, string>>,
                                spaceMappings: Map<string, string>,
                                dmTargetIdsBySourceIds: Map<string, string>,
                                importedVersionsByNodeKey: Map<string, string[]>,
                                draftIdsByPackageKeyAndVersion: Map<string, string>,
                                importedFilePath: string,
                                excludeActionFlows?: boolean): Promise<void> {
        const importedPackageVersion = importedVersionsByNodeKey.get(packageToImport.packageKey) ?? [];
        const versionsOfPackage = [...packageToImport.dependenciesByVersion.keys()].sort((k1, k2) => {
            const version1 = new SemanticVersioning(k1);
            const version2 = new SemanticVersioning(k1);
            return version1.isGreaterThan(version2) ? 1 : -1;
        }).filter(version => !importedPackageVersion.includes(version));

        for (const version of versionsOfPackage) {
            try {
                await this.importPackageVersion(packageToImport, manifestNodes, sourceToTargetVersionsByNodeKey, spaceMappings, dmTargetIdsBySourceIds, importedVersionsByNodeKey, draftIdsByPackageKeyAndVersion, importedFilePath, version, excludeActionFlows);
            } catch (e) {
                logger.error(`Problem import package with key: ${packageToImport.packageKey} ${version} ${e}`);
            }
        }
    }

    private async importPackageVersion(packageToImport: ManifestNodeTransport,
                                       manifestNodes: ManifestNodeTransport[],
                                       sourceToTargetVersionsByNodeKey: Map<string, Map<string, string>>,
                                       spaceMappings: Map<string, string>,
                                       dmTargetIdsBySourceIds: Map<string, string>,
                                       importedVersionsByNodeKey: Map<string, string[]>,
                                       draftIdsByPackageKeyAndVersion: Map<string, string>,
                                       importedFilePath: string,
                                       versionOfPackageBeingImported: string,
                                       excludeActionFlows?: boolean): Promise<void> {
        if (packageToImport.dependenciesByVersion.get(versionOfPackageBeingImported).length) {
            const dependenciesOfPackageVersion = packageToImport.dependenciesByVersion.get(versionOfPackageBeingImported);
            await this.importDependencyPackages(dependenciesOfPackageVersion, manifestNodes, sourceToTargetVersionsByNodeKey, spaceMappings, dmTargetIdsBySourceIds,
                importedVersionsByNodeKey, draftIdsByPackageKeyAndVersion, importedFilePath, excludeActionFlows
            );
        }

        if (this.checkIfPackageVersionHasBeenImported(packageToImport.packageKey, versionOfPackageBeingImported, importedVersionsByNodeKey)) {
            return;
        }

        const targetSpace = await this.getTargetSpaceForExportedPackage(packageToImport, spaceMappings);

        let nodeInTargetTeam = await this.nodeApi.findOneByKeyAndRootNodeKey(packageToImport.packageKey, packageToImport.packageKey);

        const pathToZipFile = path.resolve(importedFilePath, packageToImport.packageKey + "_" + versionOfPackageBeingImported + ".zip");
        const packageZip = this.createBodyForImport(pathToZipFile);

        await this.packageApi.importPackage(packageZip, targetSpace.id, !!nodeInTargetTeam, excludeActionFlows);

        if (nodeInTargetTeam) {
            await this.packageApi.movePackageToSpace(nodeInTargetTeam.id, targetSpace.id)
        }

        nodeInTargetTeam = await this.nodeApi.findOneByKeyAndRootNodeKey(packageToImport.packageKey, packageToImport.packageKey);

        if (this.isLatestVersion(versionOfPackageBeingImported, [...packageToImport.dependenciesByVersion.keys()])) {
            if (dmTargetIdsBySourceIds.size > 0) {
                const variableAssignments = packageToImport.variables
                    .filter(variable => variable.type === PackageManagerVariableType.DATA_MODEL).map(variable => {
                        variable.value = dmTargetIdsBySourceIds.get(variable.value?.toString()) as unknown as object;
                        return variable;
                    })

                await this.variableService.assignVariableValues(nodeInTargetTeam.key, variableAssignments);
            } else {
                await this.variableService.assignVariableValues(nodeInTargetTeam.key, packageToImport.variables);
            }
        }

        draftIdsByPackageKeyAndVersion.set(`${nodeInTargetTeam.key}_${versionOfPackageBeingImported}`, nodeInTargetTeam.workingDraftId);

        await this.updateDependencyVersions(packageToImport, versionOfPackageBeingImported, sourceToTargetVersionsByNodeKey, draftIdsByPackageKeyAndVersion);
        await this.publishPackage(packageToImport);

        const packageVersionInTargetTeam = await this.packageApi.findActiveVersionById(nodeInTargetTeam.id);

        const mappedVersions = sourceToTargetVersionsByNodeKey.get(packageToImport.packageKey) ?? new Map<string, string>();
        mappedVersions.set(versionOfPackageBeingImported, packageVersionInTargetTeam.version);
        sourceToTargetVersionsByNodeKey.set(packageToImport.packageKey, mappedVersions);

        const importedVersionsOfPackage = importedVersionsByNodeKey.get(packageToImport.packageKey) ?? [];
        importedVersionsOfPackage.push(versionOfPackageBeingImported);
        importedVersionsByNodeKey.set(packageToImport.packageKey, importedVersionsOfPackage);

        const mappedVersion = sourceToTargetVersionsByNodeKey.get(packageToImport.packageKey).get(versionOfPackageBeingImported);

        logger.info(`Imported package with key: ${packageToImport.packageKey} ${versionOfPackageBeingImported} successfully. New version: ${mappedVersion}`)
    }

    private isLatestVersion(packageVersion: string, allPackageVersions: string[]): boolean {
        let isLatestVersion = true;

        for (const version of allPackageVersions) {
            const version1 = new SemanticVersioning(packageVersion);
            const version2 = new SemanticVersioning(version);

            if (version2.isGreaterThan(version1)) {
                isLatestVersion = false;
                break;
            }
        }

        return isLatestVersion;
    }

    private async importDependencyPackages(dependenciesToImport: ManifestDependency[],
                                           manifestNodes: ManifestNodeTransport[],
                                           sourceToTargetVersionsByNodeKey: Map<string, Map<string, string>>,
                                           spaceMappings: Map<string, string>,
                                           dmTargetIdsBySourceIds: Map<string, string>,
                                           importedVersionsByNodeKey: Map<string, string[]>,
                                           draftIdsByPackageKeyAndVersion: Map<string, string>,
                                           importedFilePath: string,
                                           excludeActionFlows?: boolean): Promise<void> {
        for (const dependency of dependenciesToImport) {
            if (this.checkIfPackageVersionHasBeenImported(dependency.key, dependency.version, importedVersionsByNodeKey)) {
                continue;
            }

            const dependentPackage = manifestNodes.find(node => node.packageKey === dependency.key);
            await this.importPackage(dependentPackage, manifestNodes, sourceToTargetVersionsByNodeKey, spaceMappings, dmTargetIdsBySourceIds, importedVersionsByNodeKey, draftIdsByPackageKeyAndVersion, importedFilePath, excludeActionFlows);
        }
    }

    private checkIfPackageVersionHasBeenImported(packageKey: string,
                                                 version: string,
                                                 importedVersions: Map<string, string[]>): boolean {
        const importedPackages = importedVersions.get(packageKey) ?? [];
        return importedPackages.includes(version);
    }

    private createBodyForImport(filename: string): FormData {
        const formData = new FormData();
        formData.append("package", fs.createReadStream(filename, {encoding: null}));

        return formData;
    }

    private async getTargetSpaceForExportedPackage(packageToImport: ManifestNodeTransport, spaceMappings: Map<string, string>): Promise<SpaceTransport> {
        let targetSpace: SpaceTransport;
        const allSpaces = await this.spaceService.refreshAndGetAllSpaces();
        if (spaceMappings.has(packageToImport.packageKey)) {
            const customSpaceId = spaceMappings.get(packageToImport.packageKey);
            const customSpace = allSpaces.find(space => space.id === customSpaceId);

            if (!customSpace) {
                throw Error("Provided space id does not exist");
            }

            targetSpace = customSpace;
        } else {
            targetSpace = allSpaces.find(space => space.name === packageToImport.space.spaceName);

            if (!targetSpace) {
                targetSpace = await this.spaceService.createSpace(packageToImport.space.spaceName, packageToImport.space.spaceIcon);
            }

        }

        return targetSpace;
    }

    private async updateDependencyVersions(node: ManifestNodeTransport,
                                           versionOfPackage: string,
                                           sourceToTargetVersionsByNodeKey: Map<string, Map<string, string>>,
                                           draftIdsByPackageKeyAndVersion: Map<string, string>): Promise<void> {

        const createdNode = await this.nodeApi.findOneByKeyAndRootNodeKey(node.packageKey, node.packageKey);
        const newDependencies = [];
        for (const dependency of [...node.dependenciesByVersion.get(versionOfPackage)]) {
            const nodeInTargetTeam = await this.nodeApi.findOneByKeyAndRootNodeKey(dependency.key, dependency.key);
            const draftIdOfVersionedDependency = draftIdsByPackageKeyAndVersion.get(`${dependency.key}_${dependency.version}`);
            dependency.version = sourceToTargetVersionsByNodeKey.get(dependency.key).get(dependency.version);
            dependency.updateAvailable = dependency.updateAvailable;
            dependency.id = nodeInTargetTeam.rootNodeId;
            dependency.rootNodeId = createdNode.rootNodeId;
            dependency.draftId = draftIdOfVersionedDependency;
            newDependencies.push(dependency);

            await this.packageDependenciesApi.deleteDependency(createdNode.id, dependency.key);
        }

        if (newDependencies.length) {
            await this.packageDependenciesApi.createDependencies(createdNode.id, newDependencies);
        }
    }

    public async publishPackage(packageToImport: ManifestNodeTransport): Promise<void> {
        const nodeInTargetTeam = await this.nodeApi.findOneByKeyAndRootNodeKey(packageToImport.packageKey, packageToImport.packageKey);
        const nextVersion = await this.packageApi.findNextVersion(nodeInTargetTeam.id);
        await this.packageApi.publishPackage({
            packageKey: packageToImport.packageKey,
            version: nextVersion.version,
            publishMessage: "Published package after import",
            nodeIdsToExclude: []
        });
    }

    public async batchExportPackages(packageKeys: string[], includeDependencies: boolean, excludeActionFlows?: boolean): Promise<void> {
        const allPackages = await this.packageApi.findAllPackages();
        let nodesListToExport: BatchExportNodeTransport[] = allPackages.filter(node => packageKeys.includes(node.key));

        const versionsByNodeKey = new Map<string, string[]>();

        const allPackageKeys = allPackages.map(p => p.key);

        for (const packageKey of packageKeys) {
            if (!allPackageKeys.includes(packageKey)) {
                throw  new Error(`Package ${packageKey} does not exist.`);
            }
        }

        nodesListToExport = await this.getNodesWithActiveVersion(nodesListToExport);
        if (includeDependencies) {
            const dependencyPackages = await this.getDependencyPackages(nodesListToExport, [], allPackages, [], versionsByNodeKey);
            nodesListToExport.push(...dependencyPackages);
        }

        const packagesWithVariableAssignments = await this.variableService.getVariableAssignmentsForNodes();

        nodesListToExport.forEach(node => {
            node.variables = packagesWithVariableAssignments.find(nodeWithVariablesAssignment => nodeWithVariablesAssignment.key === node.key)?.variableAssignments;
        });

        const packagesWithDataModelVariables = packagesWithVariableAssignments.map(packageWithVariablesAssignments => {
            packageWithVariablesAssignments.variableAssignments = packageWithVariablesAssignments.variableAssignments.filter(variable => variable.value && variable.type === PackageManagerVariableType.DATA_MODEL);
            return packageWithVariablesAssignments;
        });
        const dataModelDetailsByNode = await this.dataModelService.getDataModelDetailsForPackages(packagesWithDataModelVariables);

        nodesListToExport.forEach(node => {
            node.datamodels = dataModelDetailsByNode.get(node.key);
        });

        nodesListToExport = await this.spaceService.getParentSpaces(nodesListToExport);
        await this.exportToZip(nodesListToExport, versionsByNodeKey, excludeActionFlows);
    }

    public async getNodesWithActiveVersion(nodes: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const activeVersionsOfPackage = await this.packageApi.findActiveVersionByIds(nodes.map(node => node.id));

        nodes.forEach(node => {
            node.version = activeVersionsOfPackage.find(packageVersion => packageVersion.id === node.id);
        })

        return nodes;
    }

    public async getPackagesWithDependencies(draftIdByNodeId: Map<string, string>): Promise<Map<string, PackageDependencyTransport[]>> {
        return await this.packageDependenciesApi.findPackageDependenciesByIds(draftIdByNodeId);
    }

    private async getDependencyPackages(nodesToResolve: BatchExportNodeTransport[], dependencyPackages: BatchExportNodeTransport[], allPackages: ContentNodeTransport[], resolvedDependencies: string[], versionsByNodeKey: Map<string, string[]>): Promise<BatchExportNodeTransport[]> {
        const draftIdByNodeId = new Map<string, string>();
        nodesToResolve.forEach(node => draftIdByNodeId.set(node.activatedDraftId, node.id));

        const dependenciesByPackageDraftIds = await this.getPackagesWithDependencies(draftIdByNodeId);

        const nodesWithDependencies = nodesToResolve.map(nodeToExport => {
            nodeToExport.dependencies = dependenciesByPackageDraftIds[nodeToExport.activatedDraftId] ?? [];
            return nodeToExport;
        });

        for (const node of nodesWithDependencies) {
            node.dependencies = node.dependencies.filter(dependency => !(dependency.external || dependency.deleted));
            node.dependencies.forEach(dependency => {
                const dependencyVersions = versionsByNodeKey.get(dependency.key) ?? [];
                if (!dependencyVersions.includes(dependency.version)) {
                    dependencyVersions.push(dependency.version);
                    versionsByNodeKey.set(dependency.key, dependencyVersions);
                }
            });

            const nodesToGetKeys = node.dependencies.filter(dependency => {
                return !this.nodeHasBeenResolvedBefore(resolvedDependencies, dependency.key, dependency.version)
            }).map(iteratedNode => iteratedNode.key);

            if (nodesToGetKeys.length > 0) {
                const dependencyPackagesOfNode = allPackages.filter(packageNode => nodesToGetKeys.includes(packageNode.key)).map(dependency => {
                    const versionedDep = node.dependencies.find(dep => dependency.key === dep.key);
                    return {
                        ...dependency,
                        version: {
                            version: versionedDep.version
                        },
                        activatedDraftId: versionedDep.draftId
                    } as BatchExportNodeTransport
                });

                dependencyPackages.push(...dependencyPackagesOfNode);
                await this.getDependencyPackages(dependencyPackagesOfNode, dependencyPackages, allPackages, resolvedDependencies, versionsByNodeKey)
            }
        }

        return dependencyPackages;
    }

    private nodeHasBeenResolvedBefore(nodePath: string[], nodeKey: string, version: string): boolean {
        return nodePath.includes(nodeKey + ":" + version);
    }

    private exportListOfPackages(nodes: BatchExportNodeTransport[], fieldsToInclude: string[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(nodes, fieldsToInclude), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }

    private async exportPackagesAndAssets(nodes: BatchExportNodeTransport[], excludeActionFlows?: boolean): Promise<any[]> {
        const zips = [];
        for (const rootPackage of nodes) {
            const exportedPackage = await this.packageApi.exportPackage(rootPackage.key, rootPackage.version.version, excludeActionFlows)
            zips.push({
                data: exportedPackage,
                packageKey: rootPackage.key,
                version: rootPackage.version.version
            });
        }
        return zips;
    }

    private async exportToZip(nodes: BatchExportNodeTransport[], versionsByNodeKey: Map<string, string[]>, excludeActionFlows?: boolean): Promise<void> {
        const manifestNodes = this.exportManifestOfPackages(nodes, versionsByNodeKey);
        const packageZips = await this.exportPackagesAndAssets(nodes, excludeActionFlows);

        const zip = new AdmZip();

        zip.addFile("manifest.yml", Buffer.from(stringify(manifestNodes), "utf8"));
        for (const packageZip of packageZips) {
            zip.addFile(`${packageZip.packageKey}_${packageZip.version}.zip`, packageZip.data)
        }

        const fileName = "export_" + uuidv4() + ".zip";
        zip.writeZip(fileName);
        logger.info(this.fileDownloadedMessage + fileName);
    }

    private exportManifestOfPackages(nodes: BatchExportNodeTransport[], dependencyVersionsByNodeKey: Map<string, string[]>): ManifestNodeTransport[] {
        const manifestNodesByPackageKey = new Map<string, ManifestNodeTransport>();

        nodes.forEach(node => {
            const manifestNode = manifestNodesByPackageKey.get(node.key) ?? {} as ManifestNodeTransport;
            manifestNode.packageKey = node.key;
            manifestNode.packageId = node.id;
            manifestNode.space = {
                spaceName: node.space.name,
                spaceIcon: node.space.iconReference
            }
            manifestNode.variables = node.variables?.map(variable => {
                if (variable.type === PackageManagerVariableType.DATA_MODEL) {
                    // @ts-ignore
                    const dataModel = node.datamodels?.find(dataModel => dataModel.dataModelId === variable.value);
                    return {
                        key: variable.key,
                        type: variable.type,
                        value: variable.value,
                        dataModelName: dataModel?.name,
                    }
                }
                return variable;
            });
            manifestNode.dependenciesByVersion = manifestNode.dependenciesByVersion ?? new Map<string, ManifestDependency[]>();
            manifestNode.dependenciesByVersion.set(node.version.version, node.dependencies ?? []);
            manifestNodesByPackageKey.set(node.key, manifestNode);
        })

        return [...manifestNodesByPackageKey.values()];
    }

    private readManifestFile(importedFileName: string): Promise<ManifestNodeTransport[]> {
        const manifest: ManifestNodeTransport[] = parse(
            fs.readFileSync(path.resolve(importedFileName + "/manifest.yml"), { encoding: "utf-8" })
        );
        return Promise.all(manifest);
    }
}
