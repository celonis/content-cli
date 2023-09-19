import {FatalError, logger} from "../../util/logger";
import {packageApi} from "../../api/package-api";
import {v4 as uuidv4} from "uuid";
import {FileService, fileService} from "../file-service";
import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";
import {dataModelService} from "./datamodel-service";
import {ContentNodeTransport, PackageDependencyTransport} from "../../interfaces/package-manager.interfaces";
import {nodeApi} from "../../api/node-api";
import {packageDependenciesApi} from "../../api/package-dependencies-api";
import {variableService} from "./variable-service";
import {spaceService} from "./space-service";
import * as fs from "fs";
import AdmZip = require("adm-zip");
import * as path from "path";
import {tmpdir} from "os";
import {SpaceTransport} from "../../interfaces/save-space.interface";
import {ManifestDependency, ManifestNodeTransport} from "../../interfaces/manifest-transport";
import {DataPoolInstallVersionReport} from "../../interfaces/data-pool-manager.interfaces";
import {SemanticVersioning} from "../../util/semantic-versioning";
import {stringify} from "../../util/yaml";

class PackageService {
    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    public async listPackages(): Promise<void> {
        const nodes = await packageApi.findAllPackages();
        nodes.forEach(node => {
            logger.info(`${node.name} - Key: "${node.key}"`);
        });
    }

    public async findAndExportListOfAllPackages(includeDependencies: boolean, packageKeys: string[]): Promise<void> {
        const fieldsToInclude = ["key", "name", "changeDate", "activatedDraftId", "spaceId"];

        let nodesListToExport: BatchExportNodeTransport[] = await packageApi.findAllPackages();
        if (packageKeys.length > 0) {
            nodesListToExport = nodesListToExport.filter(node => {
                return packageKeys.includes(node.rootNodeKey);
            })
        }

        if (includeDependencies) {
            fieldsToInclude.push("type", "value", "dependencies", "id", "updateAvailable", "version", "poolId", "node", "dataModelId", "dataPool", "datamodels");

            const packagesKeyWithActionFlows = (await nodeApi.findAllNodesOfType("SCENARIO")).map(node => node.rootNodeKey);
            nodesListToExport = nodesListToExport.filter(node => {
                return !packagesKeyWithActionFlows.includes(node.rootNodeKey);
            })

            const unPublishedNodes = nodesListToExport.filter(node => !node.activatedDraftId);
            let publishedNodes = nodesListToExport.filter(node => node.activatedDraftId);

            publishedNodes = await this.getNodesWithActiveVersion(publishedNodes);

            nodesListToExport = [...publishedNodes, ...unPublishedNodes];

            const dataModelAssignments = await dataModelService.getDatamodelsForNodes(nodesListToExport);
            nodesListToExport.forEach(node => {
                node.datamodels = dataModelAssignments.get(node.key);
            })

            const draftIdByNodeId = new Map<string, string>();
            nodesListToExport.forEach(node => draftIdByNodeId.set(node.workingDraftId, node.id));

            const dependenciesByPackageIds = await this.getPackagesWithDependencies(draftIdByNodeId, packagesKeyWithActionFlows);

            nodesListToExport = nodesListToExport.map(nodeToExport => {
                nodeToExport.dependencies = dependenciesByPackageIds[nodeToExport.workingDraftId] ?? [];
                return nodeToExport;
            })
        }
        this.exportListOfPackages(nodesListToExport, fieldsToInclude);
    }

    public async batchImportPackages(spaceMappings: string[], dataModelMappingsFilePath: string, exportedPackagesFile: string, overwrite: boolean): Promise<void> {
        exportedPackagesFile = exportedPackagesFile + (exportedPackagesFile.includes(".zip") ? "" : ".zip");
        const zip = new AdmZip(exportedPackagesFile);
        const importedFilePath = path.resolve(tmpdir(), "export_" + uuidv4());
        await fs.mkdirSync(importedFilePath);
        await zip.extractAllTo(importedFilePath);

        const manifestNodes = await fileService.readManifestFile(importedFilePath);

        if (!overwrite) {
            const allTargetPackages = await packageApi.findAllPackages();
            const manifestNodeKeys = manifestNodes.map(node => node.packageKey);
            allTargetPackages
                .filter(node => manifestNodeKeys.includes(node.key))
                .forEach(node => {
                    if (node.workingDraftId !== node.activatedDraftId) {
                        throw new FatalError(`Cannot overwrite package that has unpublished changes. Package with key ${node.key}`)
                    }
                })
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
            await this.importPackage(node, manifestNodes, sourceToTargetVersionsByNodeKey, customSpacesMap, dmTargetIdsBySourceIds, importedVersionsByNodeKey, draftIdsByPackageKeyAndVersion, importedFilePath)
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
                                importedFilePath: string): Promise<void> {
        const importedPackageVersion = importedVersionsByNodeKey.get(packageToImport.packageKey) ?? [];
        const versionsOfPackage = [...packageToImport.dependenciesByVersion.keys()].sort((k1, k2) => {
            const version1 = new SemanticVersioning(k1);
            const version2 = new SemanticVersioning(k1);
            return version1.isGreaterThan(version2) ? 1 : -1;
        }).filter(version => !importedPackageVersion.includes(version));

        for (const version of versionsOfPackage) {
            try {
                await this.importPackageVersion(packageToImport, manifestNodes, sourceToTargetVersionsByNodeKey, spaceMappings, dmTargetIdsBySourceIds, importedVersionsByNodeKey, draftIdsByPackageKeyAndVersion, importedFilePath, version);
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
                                       versionOfPackageBeingImported: string): Promise<void> {
        if (packageToImport.dependenciesByVersion.get(versionOfPackageBeingImported).length) {
            const dependenciesOfPackageVersion = packageToImport.dependenciesByVersion.get(versionOfPackageBeingImported);
            await this.importDependencyPackages(dependenciesOfPackageVersion, manifestNodes, sourceToTargetVersionsByNodeKey, spaceMappings, dmTargetIdsBySourceIds,
                importedVersionsByNodeKey, draftIdsByPackageKeyAndVersion, importedFilePath
            );
        }

        if (this.checkIfPackageVersionHasBeenImported(packageToImport.packageKey, versionOfPackageBeingImported, importedVersionsByNodeKey)) {
            return;
        }

        const targetSpace = await this.getTargetSpaceForExportedPackage(packageToImport, spaceMappings);

        let nodeInTargetTeam = await nodeApi.findOneByKeyAndRootNodeKey(packageToImport.packageKey, packageToImport.packageKey);

        const pathToZipFile = path.resolve(importedFilePath, packageToImport.packageKey + "_" + versionOfPackageBeingImported + ".zip");
        const packageZip = await this.createBodyForImport(pathToZipFile);

        await packageApi.importPackage(packageZip, targetSpace.id, !!nodeInTargetTeam);

        if (nodeInTargetTeam) {
            await packageApi.movePackageToSpace(nodeInTargetTeam.id, targetSpace.id)
        }

        nodeInTargetTeam = await nodeApi.findOneByKeyAndRootNodeKey(packageToImport.packageKey, packageToImport.packageKey);

        if (this.isLatestVersion(versionOfPackageBeingImported, [...packageToImport.dependenciesByVersion.keys()])) {
            const variableAssignments = packageToImport.variables
                .filter(variable => variable.type === "DATA_MODEL").map(variable => {
                    variable.value = dmTargetIdsBySourceIds.get(variable.value?.toString()) as unknown as object;
                    return variable;
                })

            await variableService.assignVariableValues(nodeInTargetTeam.key, variableAssignments);
        }

        draftIdsByPackageKeyAndVersion.set(`${nodeInTargetTeam.key}_${versionOfPackageBeingImported}`, nodeInTargetTeam.workingDraftId);

        await this.updateDependencyVersions(packageToImport, versionOfPackageBeingImported, sourceToTargetVersionsByNodeKey, draftIdsByPackageKeyAndVersion);
        await this.publishPackage(packageToImport);

        const packageVersionInTargetTeam = await packageApi.findActiveVersionById(nodeInTargetTeam.id);

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
                                           importedFilePath: string): Promise<void> {
        for (const dependency of dependenciesToImport) {
            if (this.checkIfPackageVersionHasBeenImported(dependency.key, dependency.version, importedVersionsByNodeKey)) {
                continue;
            }

            const dependentPackage = manifestNodes.find((node) => node.packageKey === dependency.key);
            await this.importPackage(dependentPackage, manifestNodes, sourceToTargetVersionsByNodeKey, spaceMappings, dmTargetIdsBySourceIds, importedVersionsByNodeKey, draftIdsByPackageKeyAndVersion, importedFilePath);
        }
    }

    private checkIfPackageVersionHasBeenImported(packageKey: string,
                                                 version: string,
                                                 importedVersions: Map<string, string[]>): boolean {
        const importedPackages = importedVersions.get(packageKey) ?? [];
        return importedPackages.includes(version);
    }

    private async createBodyForImport(filename: string): Promise<object> {
        return {
            formData: {
                package: await fs.createReadStream(filename, {encoding: null})
            },
        }
    }

    private async getTargetSpaceForExportedPackage(packageToImport: ManifestNodeTransport, spaceMappings: Map<string, string>): Promise<SpaceTransport> {
        let targetSpace;
        const allSpaces = await spaceService.getAllSpaces();
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
                targetSpace = await spaceService.createSpace(packageToImport.space.spaceName, packageToImport.space.spaceIcon);
            }

        }

        return targetSpace;
    }

    private async updateDependencyVersions(node: ManifestNodeTransport,
                                           versionOfPackage: string,
                                           sourceToTargetVersionsByNodeKey: Map<string, Map<string, string>>,
                                           draftIdsByPackageKeyAndVersion: Map<string, string>): Promise<void> {

        const createdNode = await nodeApi.findOneByKeyAndRootNodeKey(node.packageKey, node.packageKey);
        const newDependencies = [];
        for (const dependency of [...node.dependenciesByVersion.get(versionOfPackage)]) {
            const nodeInTargetTeam = await nodeApi.findOneByKeyAndRootNodeKey(dependency.key, dependency.key);
            const draftIdOfVersionedDependency = draftIdsByPackageKeyAndVersion.get(`${dependency.key}_${dependency.version}`);
            dependency.version = sourceToTargetVersionsByNodeKey.get(dependency.key).get(dependency.version);
            dependency.updateAvailable = dependency.updateAvailable;
            dependency.id = nodeInTargetTeam.rootNodeId;
            dependency.rootNodeId = createdNode.rootNodeId;
            dependency.draftId = draftIdOfVersionedDependency;
            newDependencies.push(dependency);

            await packageDependenciesApi.deleteDependency(createdNode.id, dependency.key);
        }

        if (newDependencies.length) {
            await packageDependenciesApi.createDependencies(createdNode.id, newDependencies);
        }
    }

    public async publishPackage(packageToImport: ManifestNodeTransport): Promise<void> {
        const nodeInTargetTeam = await nodeApi.findOneByKeyAndRootNodeKey(packageToImport.packageKey, packageToImport.packageKey);
        const nextVersion = await packageApi.findNextVersion(nodeInTargetTeam.id);
        await packageApi.publishPackage({
            packageKey: packageToImport.packageKey,
            version: nextVersion.version,
            publishMessage: "Published package after import",
            nodeIdsToExclude: []
        });
    }

    public async batchExportPackages(packageKeys: string[], includeDependencies: boolean): Promise<void> {
        const allPackages = await packageApi.findAllPackages();
        let nodesListToExport: BatchExportNodeTransport[] = allPackages.filter(node => packageKeys.includes(node.key));
        const actionFlowsPackageKeys = (await nodeApi.findAllNodesOfType("SCENARIO")).map(node => node.rootNodeKey);
        nodesListToExport = nodesListToExport.filter(node => !actionFlowsPackageKeys.includes(node.key));

        const versionsByNodeKey = new Map<string, string[]>();

        const allPackageKeys = allPackages.map(p => p.key);

        for (const packageKey of packageKeys) {
            if (!allPackageKeys.includes(packageKey)) {
                throw  new Error(`Package ${packageKey} does not exist.`);
            }
        }


        nodesListToExport = await this.getNodesWithActiveVersion(nodesListToExport);
        if (includeDependencies) {
            const dependencyPackages = await this.getDependencyPackages(nodesListToExport, [], allPackages, actionFlowsPackageKeys, [], versionsByNodeKey);
            nodesListToExport.push(...dependencyPackages);
        }

        const variableAssignments = await variableService.getVariableAssignmentsForNodes(nodesListToExport);

        nodesListToExport.forEach(node => {
            node.variables = variableAssignments.find(nodeWithVariablesAssignment => nodeWithVariablesAssignment.key === node.key)?.variableAssignments;
        });

        const dataModelAssignments = await dataModelService.getDatamodelsForNodes(nodesListToExport);
        nodesListToExport.forEach(node => {
            node.datamodels = dataModelAssignments.get(node.key);
        });

        nodesListToExport = await spaceService.getParentSpaces(nodesListToExport);

        await this.exportToZip(nodesListToExport, versionsByNodeKey);
    }

    public async getNodesWithActiveVersion(nodes: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const activeVersionsOfPackage = await packageApi.findActiveVersionByIds(nodes.map(node => node.id));

        nodes.forEach(node => {
            node.version = activeVersionsOfPackage.find(packageVersion => packageVersion.id === node.id);
        })

        return nodes;
    }

    public async getPackagesWithDependencies(draftIdByNodeId: Map<string, string>, actionFlowPackageKeys: string[]): Promise<Map<string, PackageDependencyTransport[]>> {
        const allPackageDependencies: Map<string, PackageDependencyTransport[]> = await packageDependenciesApi.findPackageDependenciesByIds(draftIdByNodeId);

        Object.values(allPackageDependencies).forEach((value, key) => {
            value = value.filter((dependency => actionFlowPackageKeys.includes(dependency.key)))
        })

        return allPackageDependencies;
    }

    private async getDependencyPackages(nodesToResolve: BatchExportNodeTransport[], dependencyPackages: BatchExportNodeTransport[], allPackages: ContentNodeTransport[], actionFlowPackageKeys: string[], resolvedDependencies: string[], versionsByNodeKey: Map<string, string[]>): Promise<BatchExportNodeTransport[]> {
        const draftIdByNodeId = new Map<string, string>();
        nodesToResolve.forEach(node => draftIdByNodeId.set(node.activatedDraftId, node.id));

        const dependenciesByPackageDraftIds = await this.getPackagesWithDependencies(draftIdByNodeId, actionFlowPackageKeys);

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
                await this.getDependencyPackages(dependencyPackagesOfNode, dependencyPackages, allPackages, actionFlowPackageKeys, resolvedDependencies, versionsByNodeKey)
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

    private async exportPackagesAndAssets(nodes: BatchExportNodeTransport[]): Promise<any[]> {
        const zips = [];
        for (const rootPackage of nodes) {
            const exportedPackage = await packageApi.exportPackage(rootPackage.key, rootPackage.version.version)
            zips.push({
                data: exportedPackage,
                packageKey: rootPackage.key,
                version: rootPackage.version.version
            });
        }
        return zips;
    }

    private async exportToZip(nodes: BatchExportNodeTransport[], versionsByNodeKey: Map<string, string[]>): Promise<void> {
        const manifestNodes = this.exportManifestOfPackages(nodes, versionsByNodeKey);
        const packageZips = await this.exportPackagesAndAssets(nodes);

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

        nodes.forEach((node) => {
            const manifestNode = manifestNodesByPackageKey.get(node.key) ?? {} as ManifestNodeTransport;
            manifestNode.packageKey = node.key;
            manifestNode.packageId = node.id;
            manifestNode.space = {
                spaceName: node.space.name,
                spaceIcon: node.space.iconReference
            }
            manifestNode.variables = node.variables?.map((variable) => {
                if (variable.type === "DATA_MODEL") {
                    // @ts-ignore
                    const dataModel = node.datamodels?.find(dataModel => dataModel.node.dataModelId === variable.value);
                    return {
                        key: variable.key,
                        type: variable.type,
                        value: variable.value,
                        dataModelName: dataModel?.node.name,
                        dataPoolName: dataModel?.dataPool.name
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
}

export const packageService = new PackageService();
