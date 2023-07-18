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
            nodesListToExport.forEach(node => draftIdByNodeId.set(node.workingDraftId, node.id));

            const dependenciesByPackageIds = await this.getPackagesWithDependencies(draftIdByNodeId, packagesKeyWithActionFlows);

            nodesListToExport = nodesListToExport.map(nodeToExport => {
                nodeToExport.dependencies = dependenciesByPackageIds[nodeToExport.workingDraftId] ?? [];
                return nodeToExport;
            })
        }
        this.exportListOfPackages(nodesListToExport, fieldsToInclude);
    }

    public async batchImportPackages(spaceMappings: string[], dataModelMapping: string, exportedPackagesFile: string): Promise<void> {
        exportedPackagesFile = exportedPackagesFile + (exportedPackagesFile.includes(".zip") ? "" : ".zip");
        const zip = new AdmZip(exportedPackagesFile);
        const importedFilePath = path.resolve(tmpdir(), "export_" + uuidv4());
        await fs.mkdirSync(importedFilePath);
        await zip.extractAllTo(importedFilePath);

        const manifestNodes = await fileService.readManifestFile(importedFilePath);

        //TO-DO [DS-1462](https://celonis.atlassian.net/browse/DP-1462) Use mapping to set new datamodelIds.
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

        const allPackageKeys = allPackages.map(p => p.key);

        for(const packageKey of packageKeys) {
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

    private async importPackage(packageToImport: ManifestNodeTransport, manifestNodes: ManifestNodeTransport[], spaceMappings: string[], allSpaces: SpaceTransport[], importedKeys: string[], importedFilePath: string) {
      // TODO [TN-4317](https://celonis.atlassian.net/browse/TN-4317)
    }

    private async updateDependencyVersions(node: ManifestNodeTransport): Promise<void> {
        // TODO [TN-4317](https://celonis.atlassian.net/browse/TN-4317)
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

        zip.addFile("manifest.yml", Buffer.from(YAML.stringify(manifestNodes), "utf8"));
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
