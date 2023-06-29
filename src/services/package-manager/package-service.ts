import {logger} from "../../util/logger";
import {packageApi} from "../../api/package-api";
import {v4 as uuidv4} from "uuid";
import {FileService, fileService} from "../file-service";
import {
    BatchExportNodeTransport,
    ManifestNodeTransport, PackageAndAssetTransport
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
import AdmZip = require("adm-zip");

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

    private async fillNodeDependencies(nodesListToExport: BatchExportNodeTransport[], allPackages: ContentNodeTransport[], actionFlowPackageKeys: string[]): Promise<BatchExportNodeTransport[]> {
        nodesListToExport = await this.getVersionOfPackages(nodesListToExport);

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
            const exportedPackage = await this.httpClientService.pullFileData(`${profile.team}/package-manager/api/packages/${rootPackage.key}/export`, profile);
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
            manifestNode.dependencies = node.dependencies?.map(dependency => {
                return {
                    packageKey: dependency.key,
                    version: dependency.version,
                    external: dependency.external
                }
            });
            manifestNodes.push(manifestNode);
        })

        return manifestNodes;
    }
}

export const packageService = new PackageService();
