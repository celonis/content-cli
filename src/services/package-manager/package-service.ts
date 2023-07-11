import {logger} from "../../util/logger";
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
import * as YAML from "yaml";
import * as fs from "fs";
import AdmZip = require("adm-zip");
import {spaceApi} from "../../api/space-api";
import * as path from "path";
import {tmpdir} from "os";
import {SpaceTransport} from "../../interfaces/save-space.interface";
import {ManifestDependency, ManifestNodeTransport} from "../../interfaces/manifest-transport";

class PackageService {
    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    public async listPackages(): Promise<void> {
        const nodes = await packageApi.findAllPackages();
        nodes.forEach(node => {
            logger.info(`${node.name} - Key: "${node.key}"`);
        });
    }

    public async findAndExportListOfAllPackages(includeDependencies: boolean): Promise<void> {
        const fieldsToInclude = ["key", "name", "changeDate", "activatedDraftId", "spaceId"];

        let nodesListToExport: BatchExportNodeTransport[] = await packageApi.findAllPackages();

        if (includeDependencies) {
            fieldsToInclude.push("type", "value", "dependencies", "id", "updateAvailable", "version", "poolId", "node", "dataModelId", "dataPool", "datamodels");

            const packagesKeyWithActionFlows = (await nodeApi.findAllNodesOfType("SCENARIO")).map(node => node.rootNodeKey);
            nodesListToExport = nodesListToExport.filter(node => {
                return !packagesKeyWithActionFlows.includes(node.rootNodeKey);
            })

            nodesListToExport = await this.getNodesWithActiveVersion(nodesListToExport);

            const dataModelAssignments = await dataModelService.getDatamodelsForNodes(nodesListToExport);
            nodesListToExport.forEach(node => {
                node.datamodels = dataModelAssignments.get(node.key);
            })

            const draftIdByNodeId = new Map<string, string>();
            const nodeIds = nodesListToExport.map(node => {
                draftIdByNodeId.set(node.id, node.workingDraftId);
                return node.id;
            });

            const dependenciesByPackageId = await this.getPackagesDependenciesByPackageId(nodeIds, draftIdByNodeId, packagesKeyWithActionFlows);

            nodesListToExport = nodesListToExport.map(nodeToExport => {
                nodeToExport.dependencies = dependenciesByPackageId.get(nodeToExport.id);
                return nodeToExport;
            })
        }
        this.exportListOfPackages(nodesListToExport, fieldsToInclude);
    }

    public async batchImportPackages(spaceMappings: string[], exportedDatapoolsFile: string, exportedPackagesFile: string): Promise<void> {
        exportedPackagesFile = exportedPackagesFile + (exportedPackagesFile.includes(".zip") ? "" : ".zip");
        const zip = new AdmZip(exportedPackagesFile);
        const importedFilePath = path.resolve(tmpdir(), "export_" + uuidv4());
        await fs.mkdirSync(importedFilePath);
        await zip.extractAllTo(importedFilePath);

        const manifestNodes = await fileService.readManifestFile(importedFilePath);
        //TO-DO Import data-pools and data models based on the package variables
        const allSpaces = await spaceApi.findAllSpaces();
        const importedKeys = [];
        for (const node of manifestNodes) {
            await this.importPackage(node, manifestNodes, spaceMappings, allSpaces, importedKeys, importedFilePath)
        }
    }

    public async batchExportPackages(packageKeys: string[], includeDependencies: boolean): Promise<void> {
        const allPackages = await packageApi.findAllPackages();
        let nodesListToExport: BatchExportNodeTransport[] = allPackages.filter(node => packageKeys.includes(node.key));
        const actionFlowsPackageKeys = (await nodeApi.findAllNodesOfType("SCENARIO")).map(node => node.rootNodeKey);
        nodesListToExport = nodesListToExport.filter(node => !actionFlowsPackageKeys.includes(node.key));

        const versionsByNodeKey = new Map<string, string[]>();

        nodesListToExport.forEach(node => {
            const versions = [node?.version?.version];
            versionsByNodeKey.set(node.key, versions);
        });

        if (includeDependencies) {
            nodesListToExport = await this.fillNodeDependencies(nodesListToExport, allPackages, actionFlowsPackageKeys, [], versionsByNodeKey);
        }

        nodesListToExport = await spaceService.getParentSpaces(nodesListToExport);
        await this.exportToZip(nodesListToExport, versionsByNodeKey);
    }

    public async getVersionOfPackages(nodes: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const promises = [];

        nodes.forEach(node => {
            promises.push(new Promise(async resolve => {
                node.version = await packageApi.findLatestVersionById(node.id);
                resolve(node);
            }));
        })

        return Promise.all(promises);
    }

    public async getNodesWithActiveVersion(nodes: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const promises = [];
        nodes.forEach(node => {
            promises.push(new Promise(async resolve => {
                node.version = await packageApi.findActiveVersionById(node.id);
                resolve(node);
            }));
        })

        return Promise.all(promises);
    }

    public async getPackagesWithDependencies(nodeIds: string[], draftIdByNodeId: Map<string, string>, actionFlowPackageKeys: string[]): Promise<PackageDependencyTransport[]> {
        const promises = [];

        nodeIds.forEach(async nodeId => promises.push(packageDependenciesApi.findDependenciesOfPackage(nodeId, draftIdByNodeId.get(nodeId))));
        const results: PackageDependencyTransport[][] = await Promise.all(promises);
        results.forEach(listOfDependencies => {
            listOfDependencies = listOfDependencies.filter(dependency => actionFlowPackageKeys.includes(dependency.key));
        });
        const dependencies: PackageDependencyTransport[] = [];
        results.forEach(result => dependencies.push(...result));

        return dependencies;
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

    private async getPackagesDependenciesByPackageId(nodeIds: string[], draftIdByNodeId: Map<string, string>, actionFlowPackageKeys: string[]): Promise<Map<string, PackageDependencyTransport[]>> {
        const dependenciesByPackageId = new Map<string, PackageDependencyTransport[]>();
        const packageWithDependencies = await this.getPackagesWithDependencies(nodeIds, draftIdByNodeId, actionFlowPackageKeys);

        packageWithDependencies.forEach(packageWithDependency => {
            const dependenciesOfPackage = dependenciesByPackageId.get(packageWithDependency.rootNodeId) ?? [];
            dependenciesOfPackage.push(packageWithDependency);
            dependenciesByPackageId.set(packageWithDependency?.rootNodeId, dependenciesOfPackage);
        });

        return dependenciesByPackageId
    }

    private async importPackage(packageToImport: ManifestNodeTransport, manifestNodes: ManifestNodeTransport[], spaceMappings: string[], allSpaces: SpaceTransport[], importedKeys: string[], importedFilePath: string) {
        if (importedKeys.includes(packageToImport.packageKey)) {
            return;
        }
        let targetSpaceId;
        if (packageToImport.dependencies.length > 0) {
            for (const dependency of packageToImport.dependencies) {
                if (!dependency.external) {
                    const dependentPackage = manifestNodes.find((node) => node.packageKey === dependency.key);
                    await this.importPackage(dependentPackage, manifestNodes, spaceMappings, allSpaces, importedKeys, importedFilePath)
                }
            }
        }

        let targetSpace = allSpaces.find(space => space.name === packageToImport.space.spaceName)
        const customSpacesMap: Map<string, string> = new Map();
        spaceMappings.forEach(spaceMap => {
            const packageAndSpaceid = spaceMap.split(":");
            customSpacesMap.set(packageAndSpaceid[0], packageAndSpaceid[1])
        })
        const customSpaceId = customSpacesMap.get(packageToImport.packageKey);
        if (customSpaceId) {
            const customSpace = allSpaces.find(space => space.id === customSpaceId)
            if (!customSpace) {
                throw Error("Provided space id does not exist");
            }
            targetSpaceId = customSpace.id;
        } else {
            if (!targetSpace) {
                targetSpace = await spaceApi.createSpace({
                    id: uuidv4(),
                    name: packageToImport.space.spaceName,
                    iconReference: packageToImport.space.spaceIcon
                });
            }
            targetSpaceId = targetSpace.id;
        }

        const packageZip = {
            formData: {
                package: await fs.createReadStream(path.resolve(importedFilePath, packageToImport.packageKey + ".zip"), {encoding: null})
            },
        };
        importedKeys.push(packageToImport.packageKey);
        const nodeInTargetTeam = await nodeApi.findOneByKeyAndRootNodeKey(packageToImport.packageKey, packageToImport.packageKey);
        await packageApi.importPackage(packageZip, targetSpaceId, !!nodeInTargetTeam);
        if (nodeInTargetTeam) {
            await packageApi.movePackageToSpace(nodeInTargetTeam.id, targetSpaceId)
        }
        await this.updateDependencyVersions(packageToImport);
        await this.publishPackage(packageToImport);
        logger.info(`Imported package with key: ${packageToImport.packageKey} successfully`)
    }

    private async updateDependencyVersions(node: ManifestNodeTransport): Promise<void> {
        const createdNode = await nodeApi.findOneByKeyAndRootNodeKey(node.packageKey, node.packageKey);
        for (const dependency of node.dependencies) {
            const nodeInTargetTeam = await nodeApi.findOneByKeyAndRootNodeKey(dependency.key, dependency.key);
            const nextVersion = await packageApi.findActiveVersionById(nodeInTargetTeam.id);
            dependency.version = nextVersion.version;
            dependency.updateAvailable = false;
            dependency.id = nodeInTargetTeam.rootNodeId;
            dependency.rootNodeId = nodeInTargetTeam.rootNodeId;
            await packageDependenciesApi.updatePackageDependency(createdNode.id, dependency);
        }
    }

    private async fillNodeDependencies(nodesListToExport: BatchExportNodeTransport[], allPackages: ContentNodeTransport[], actionFlowPackageKeys: string[], nodePath: string[], versionsByNodeKey: Map<string, string[]>): Promise<BatchExportNodeTransport[]> {
        let nodesListWithActiveVersion = await this.getNodesWithActiveVersion(nodesListToExport);

        const draftIdByNodeId = new Map<string, string>();
        const nodeIds = nodesListWithActiveVersion.map(node => {
            draftIdByNodeId.set(node.id, node.workingDraftId);
            return node.id;
        });

        const dependenciesByPackageId = await this.getPackagesDependenciesByPackageId(nodeIds, draftIdByNodeId, actionFlowPackageKeys);

        nodesListWithActiveVersion = nodesListWithActiveVersion.map(nodeToExport => {
            nodeToExport.dependencies = dependenciesByPackageId.get(nodeToExport.id) ?? [];
            return nodeToExport;
        })

        const variableAssignments = await variableService.getVariableAssignmentsForNodes(nodesListWithActiveVersion);

        nodesListWithActiveVersion.forEach(node => {
            node.variables = variableAssignments.find(nodeWithVariablesAssignment => nodeWithVariablesAssignment.key === node.key)?.variableAssignments;
        });

        const dataModelAssignments = await dataModelService.getDatamodelsForNodes(nodesListToExport);
        nodesListWithActiveVersion.forEach(node => {
            node.datamodels = dataModelAssignments.get(node.key);
        })

        nodesListToExport = await this.getNodeDependencies(nodesListToExport, allPackages, actionFlowPackageKeys, nodePath, versionsByNodeKey);
        return nodesListToExport
    }

    private async getNodeDependencies(nodesListToExport: BatchExportNodeTransport[], allPackages: ContentNodeTransport[], actionFlowPackageKeys: string[], nodePath: string[], versionsByNodeKey: Map<string, string[]>): Promise<BatchExportNodeTransport[]> {
        for (const node of nodesListToExport) {
            const nodesToGetKeys = node.dependencies.filter(dependency => !nodesListToExport
                .map(node => node.key)
                .includes(dependency.key))
                .map(dependency => dependency.key);

            const dependencyVersionByKey = new Map<string, string>();

            node.dependencies.forEach(dependency => {
                const dependencyVersion = versionsByNodeKey.has(dependency.key) ? versionsByNodeKey.get(dependency.key) : [];
                if (!dependencyVersion.includes(dependency.version)) {
                    dependencyVersion.push(dependency.version);
                    dependencyVersionByKey.set(dependency.key, dependency.version);
                }
            });

            if (nodesToGetKeys.length > 0) {
                const packageVersions = versionsByNodeKey.get(node.key);
                if (packageVersions && packageVersions.length) {
                    packageVersions.forEach(version => {
                        if (this.checkForCircularDependencies(nodePath, node.key, version)) {
                            throw Error("Cannot export package that has a circular dependency");
                        }
                        nodePath.push(node.key + ":" + version);
                    })
                } else {
                    if (this.checkForCircularDependencies(nodePath, node.key, node.version.version)) {
                        throw Error("Cannot export package that has a circular dependency");
                    }
                    nodePath.push(node.key + ":" + node.version.version);
                }
                let dependencyNodes = allPackages.filter(packageNode => nodesToGetKeys.includes(packageNode.key));
                dependencyNodes = await this.fillNodeDependencies(dependencyNodes, allPackages, actionFlowPackageKeys, [...nodePath], versionsByNodeKey);
                nodesListToExport.push(...dependencyNodes);
            }
        }
        return nodesListToExport;
    }

    private checkForCircularDependencies(nodePath: string[], nodeKey: string, version: string): boolean {
        return nodePath.includes(nodeKey + ":" + version);
    }

    private exportListOfPackages(nodes: BatchExportNodeTransport[], fieldsToInclude: string[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(nodes, fieldsToInclude), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }

    private async exportPackagesAndAssets(nodes: BatchExportNodeTransport[], versionsByNodeKey: Map<string, string[]>): Promise<any[]> {
        const zips = [];
        const packages = nodes as ContentNodeTransport[];
        const exportedPackageVersion = [];
        for (const rootPackage of packages) {
            const packageVersionsToExport = versionsByNodeKey.get(rootPackage.key);
            let exportedPackage;
            for (const version of packageVersionsToExport) {
                // if (version) {
                //     if (exportedPackageVersion.includes(rootPackage.key + ":" + version)) {
                //         return;
                //     }
                //     exportedPackage = await packageApi.exportPackage(rootPackage.key, version)
                //     zips.push({
                //         data: exportedPackage,
                //         packageKey: rootPackage.key
                //     });
                //     exportedPackageVersion.push(rootPackage.key + ":" + version);
                //     return;
                // }

                exportedPackage = await packageApi.exportPackage(rootPackage.key)
                zips.push({
                    data: exportedPackage,
                    packageKey: rootPackage.key,
                    version: version ?? ""
                });
            }

        }
        return zips;
    }

    private async exportToZip(nodes: BatchExportNodeTransport[], versionsByNodeKey: Map<string, string[]>): Promise<void> {
        const manifestNodes = this.exportManifestOfPackages(nodes, versionsByNodeKey);
        const packageZips = await this.exportPackagesAndAssets(nodes, versionsByNodeKey);

        const zip = new AdmZip();

        zip.addFile("manifest.yml", Buffer.from(YAML.stringify(manifestNodes), "utf8"));
        for (const packageZip of packageZips) {
            const packageVersion = packageZip.version ? packageZip.version : "";
            const fileName = packageVersion ? `${packageZip.packageKey}:${packageZip.version}` : packageZip.packageKey;
            zip.addFile(fileName + ".zip", packageZip.data)
        }
        zip.writeZip("export_" + uuidv4() + ".zip");
        logger.info("Successfully exported package");
    }

    private exportManifestOfPackages(nodes: BatchExportNodeTransport[], dependencyVersionsByNodeKey: Map<string, string[]>): ManifestNodeTransport[] {
        const manifestNodes: ManifestNodeTransport[] = [];
        nodes.forEach((node) => {
            const manifestNode = {} as ManifestNodeTransport;
            manifestNode.packageKey = node.key;
            manifestNode.packageId = node.id;
            manifestNode.packageVersion = node?.version?.version;
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
            manifestNode.dependencies = node.dependencies as ManifestDependency[];
            manifestNode.usedVersions = dependencyVersionsByNodeKey.get(node.key);
            manifestNodes.push(manifestNode);
        })

        return manifestNodes;
    }
}

export const packageService = new PackageService();
