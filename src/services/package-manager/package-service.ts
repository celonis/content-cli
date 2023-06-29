import {logger} from "../../util/logger";
import {packageApi} from "../../api/package-api";
import {v4 as uuidv4} from "uuid";
import {FileService, fileService} from "../file-service";
import {
    BatchExportNodeTransport, ManifestDependency,
    ManifestNodeTransport, PackageAndAssetTransport, SpaceMappingTransport
} from "../../interfaces/batch-export-node-transport";
import {dataModelService} from "./datamodel-service";
import {ContentNodeTransport, PackageDependencyTransport} from "../../interfaces/package-manager.interfaces";
import {nodeApi} from "../../api/node-api";
import {packageDependenciesApi} from "../../api/package-dependencies-api";
import {variableService} from "./variable-service";
import {spaceService} from "./space-service";
import {HttpClientService} from "../http-client.service";
import {ProfileService} from "../profile.service";
import * as YAML from 'yaml';
import * as fs from "fs";
import AdmZip = require("adm-zip");
import {spaceApi} from "../../api/space-api";
import * as path from "path";
import {SaveSpace} from "../../interfaces/save-space.interface";

class PackageService {
    private httpClientService = new HttpClientService();
    private profileService = new ProfileService();
    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    public async listPackages(): Promise<void> {
        const nodes = await packageApi.findAllPackages();
        nodes.forEach(node => {
            logger.info(`${node.name} - Key: "${node.key}"`);
        });
    }

    public async findAndExportAllPackages(includeDependencies: boolean): Promise<void> {
        const fieldsToInclude = ["key", "name", "changeDate", "activatedDraftId", "spaceId"];

        let nodesListToExport: BatchExportNodeTransport[] = await packageApi.findAllPackages();

        if (includeDependencies) {
            fieldsToInclude.push("type", "value", "dependencies", "id", "version", "poolId", "node", "dataModelId", "dataPool", "datamodels");

            const packagesKeyWithActionFlows = (await nodeApi.findAllNodesOfType("SCENARIO")).map(node => node.rootNodeKey);
            nodesListToExport = nodesListToExport.filter(node => {
                return !packagesKeyWithActionFlows.includes(node.rootNodeKey);
            })

            //TODO need to replace all these individual calls with a single api call that gets all the required data.
            nodesListToExport = await this.getVersionOfPackages(nodesListToExport);

            nodesListToExport = await dataModelService.getDatamodelsForNodes(nodesListToExport);

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

    public async batchImportPackages(spaceMapping: string[], exportedDatapoolsFile: string, exportedPackagesFile: string): Promise<void> {
        if (exportedPackagesFile) {
            const zip = new AdmZip(exportedPackagesFile + ".zip");
            await fs.mkdirSync(path.resolve(process.cwd(), "export"));
            await zip.extractAllTo("export");

            const manifestNodes = await fileService.readManifestFile(exportedPackagesFile);
            const allSpaces = await spaceApi.findAllSpaces();
            const importedKeys = [];
            for (const node of manifestNodes) {
                await this.importPackage(node, manifestNodes, spaceMapping, allSpaces, importedKeys)
            }
        } else {
            logger.error("You should provide exportedPackagesFile");
            throw Error();
        }
    }

    public async batchExportPackages(packageKeys: string[], includeDependencies: boolean, profileName: string): Promise<void> {
        const allPackages = await packageApi.findAllPackages();
        let nodesListToExport: BatchExportNodeTransport[] = allPackages.filter(node => packageKeys.includes(node.key));
        const actionFlowsPackageKeys = (await nodeApi.findAllNodesOfType("SCENARIO")).map(node => node.rootNodeKey);
        nodesListToExport = nodesListToExport.filter(node => !actionFlowsPackageKeys.includes(node.key));

        if (includeDependencies) {
            nodesListToExport = await this.fillNodeDependencies(nodesListToExport, allPackages, actionFlowsPackageKeys);
            nodesListToExport = await spaceService.getParentSpaces(nodesListToExport);
            await this.exportToZip(nodesListToExport, profileName);
        } else {
            nodesListToExport = await spaceService.getParentSpaces(nodesListToExport);
            await this.exportToZip(nodesListToExport, profileName);
        }
    }

    public async getPackagesDependenciesByPackageId(nodeIds: string[], draftIdByNodeId: Map<string, string>, actionFlowPackageKeys: string[]): Promise<Map<string, PackageDependencyTransport[]>> {
        const dependenciesByPackageId = new Map<string, PackageDependencyTransport[]>();
        const packageWithDependencies = await this.getPackagesWithDependencies(nodeIds, draftIdByNodeId, actionFlowPackageKeys);

        packageWithDependencies.forEach(packageWithDependency => {
            const dependenciesOfPackage = dependenciesByPackageId.get(packageWithDependency.rootNodeId) ?? [];
            dependenciesOfPackage.push(packageWithDependency);
            dependenciesByPackageId.set(packageWithDependency?.rootNodeId, dependenciesOfPackage);
        });

        return dependenciesByPackageId
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

    public async getActiveVersionOfPackages(nodes: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
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

<<<<<<< HEAD
    public async publishPackage(packageToImport: ManifestNodeTransport): Promise<void> {
        const nodeInTargetTeam1 = await packageApi.findOneByKeyAndRootNodeKey(packageToImport.packageKey);
        const nextVersion = await packageApi.findNextVersion(nodeInTargetTeam1.id);
        await packageApi.publishPackage({
            packageKey: packageToImport.packageKey,
            version: nextVersion.version,
            publishMessage: "Published package after import",
            nodeIdsToExclude: []
        });
    }
    private async importPackage(packageToImport: ManifestNodeTransport, manifestNodes: ManifestNodeTransport[], spaceMapping: string[], allSpaces: SaveSpace[], importedKeys: string[]) {
        if (importedKeys.includes(packageToImport.packageKey)) {
            return;
        }
        let targetSpaceId;
        if (packageToImport.dependencies.length > 0) {
            for (const dependency of packageToImport.dependencies) {
                if (!dependency.external) {
                    const dependentPackage = manifestNodes.find((node) => node.packageKey === dependency.key);
                    await this.importPackage(dependentPackage, manifestNodes, spaceMapping, allSpaces, importedKeys)
                }
            }
        }

        let targetSpace = allSpaces.find(space => space.name === packageToImport.space.spaceName)
        if (spaceMapping) {
            const customSpacesMap: SpaceMappingTransport[] = spaceMapping.map(spaceMap => {
                const packageAndSpaceid = spaceMap.split(":");
                return {
                    packageKey: packageAndSpaceid[0],
                    spaceId: packageAndSpaceid[1]
                }
            })
            const customSpaceMap = customSpacesMap.find(space => space.packageKey === packageToImport.packageKey);
            if (customSpaceMap) {
                const customSpace = allSpaces.find(space => space.id === customSpaceMap.spaceId)
                if (!customSpace) {
                    logger.error("Provided space id does not exist")
                    throw Error();
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
                package: await fs.createReadStream(path.resolve(process.cwd(), "export/" + packageToImport.packageKey + ".zip"), {encoding: null})
            },
        };
        importedKeys.push(packageToImport.packageKey);
        const nodeInTargetTeam = await packageApi.findOneByKeyAndRootNodeKey(packageToImport.packageKey);
        const packageWithKeyExists = !!nodeInTargetTeam;
        await packageApi.importPackage(packageZip, nodeInTargetTeam?.id, targetSpaceId, packageWithKeyExists);
        await this.updateDependencyVersions(packageToImport);
        await this.publishPackage(packageToImport)
    }

    private async updateDependencyVersions(node: ManifestNodeTransport): Promise<void> {
        const createdNode = await packageApi.findOneByKeyAndRootNodeKey(node.packageKey);
        for (const dependency of node.dependencies) {
            const nodeInTargetTeam = await packageApi.findOneByKeyAndRootNodeKey(dependency.key);
            const nextVersion = await packageApi.findActiveVersionById(nodeInTargetTeam.id);
            dependency.version = nextVersion.version;
            dependency.updateAvailable = false;
            dependency.id = nodeInTargetTeam.rootNodeId;
            dependency.rootNodeId = nodeInTargetTeam.rootNodeId;
            await packageApi.updatePackageDependency(createdNode.id, dependency);
        }
    }

    private async fillNodeDependencies(nodesListToExport: BatchExportNodeTransport[], allPackages: ContentNodeTransport[], actionFlowPackageKeys: string[]): Promise<BatchExportNodeTransport[]> {
        nodesListToExport = await this.getActiveVersionOfPackages(nodesListToExport);

        const draftIdByNodeId = new Map<string, string>();
        const nodeIds = nodesListToExport.map(node => {
            draftIdByNodeId.set(node.id, node.workingDraftId);
            return node.id;
        });

        const dependenciesByPackageId = await this.getPackagesDependenciesByPackageId(nodeIds, draftIdByNodeId, actionFlowPackageKeys);

        nodesListToExport = nodesListToExport.map(nodeToExport => {
            nodeToExport.dependencies = dependenciesByPackageId.get(nodeToExport.id) ?? [];
            return nodeToExport;
        })

        await variableService.getVariablesByNodeKey(nodesListToExport);
        nodesListToExport = await dataModelService.getDatamodelsForNodes(nodesListToExport);

        nodesListToExport = await this.getNodeDependecies(nodesListToExport, allPackages, actionFlowPackageKeys);
        return nodesListToExport
    }

    private async getNodeDependecies(nodesListToExport: BatchExportNodeTransport[], allPackages: ContentNodeTransport[], actionFlowPackageKeys: string[]): Promise<BatchExportNodeTransport[]> {
        for (const node of nodesListToExport) {
            const nodesToGetKeys = node.dependencies.filter(dependency => !nodesListToExport
                .map(node => node.key)
                .includes(dependency.key))
                .map(dependency => dependency.key);
            if (nodesToGetKeys.length > 0) {
                let dependencyNodes = allPackages.filter(packageNode => nodesToGetKeys.includes(packageNode.key));
                dependencyNodes = await this.fillNodeDependencies(dependencyNodes, allPackages, actionFlowPackageKeys);
                nodesListToExport.push(...dependencyNodes);
            }
        }
        return nodesListToExport;
    }

    private exportListOfPackages(nodes: BatchExportNodeTransport[], fieldsToInclude: string[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(nodes, fieldsToInclude), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }

    private async exportPackagesAndAssets(nodes: BatchExportNodeTransport[], profileName: string): Promise<any[]> {
        const zips = [];
        const packages = nodes as ContentNodeTransport[];
        for (const rootPackage of packages) {
            const profile = await this.profileService.findProfile(profileName)
            const exportedPackage = await this.httpClientService.pullFileData(`${profile.team}/package-manager/api/packages/${rootPackage.key}/export?newKey=${rootPackage.key}`, profile);
            zips.push({
                data: exportedPackage,
                packageKey: rootPackage.key
            });
        }
        return zips;
    }

    private async exportToZip(nodes: BatchExportNodeTransport[], profileName: string): Promise<void> {
        const manifestNodes = this.exportManifestOfPackages(nodes);
        const packageZips = await this.exportPackagesAndAssets(nodes, profileName);

        const zip = new AdmZip();

        zip.addFile("manifest.yml", Buffer.from(YAML.stringify(manifestNodes), "utf8"));
        for (const packageZip of packageZips) {
            zip.addFile(packageZip.packageKey + ".zip", packageZip.data)
        }
        zip.writeZip("export_" + uuidv4() + ".zip");
    }

    private exportManifestOfPackages(nodes: BatchExportNodeTransport[]): ManifestNodeTransport[] {
        const manifestNodes: ManifestNodeTransport[] = [];
        nodes.forEach((node) => {
            const manifestNode = {} as ManifestNodeTransport;
            manifestNode.packageKey = node.key;
            manifestNode.packageId = node.id;
            manifestNode.packageVersion = node.version.version;
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
            manifestNodes.push(manifestNode);
        })

        return manifestNodes;
    }
}

export const packageService = new PackageService();
