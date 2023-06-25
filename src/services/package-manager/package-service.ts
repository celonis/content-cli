import {logger} from "../../util/logger";
import {packageApi} from "../../api/package-api";
import {v4 as uuidv4} from "uuid";
import {FileService, fileService} from "../file-service";
import {
    BatchExportNodeTransport,
    ManifestDependency,
    ManifestNodeTransport
} from "../../interfaces/batch-export-node-transport";
import {dataModelService} from "./datamodel-service";
import {ContentNodeTransport, PackageDependencyTransport} from "../../interfaces/package-manager.interfaces";
import {nodeApi} from "../../api/node-api";
import {packageDependenciesApi} from "../../api/package-dependencies-api";
import {variableService} from "./variable-service";
import {SpaceExportTransport} from "../../interfaces/save-space.interface";
import {spaceService} from "./space-service";
import {computePoolApi} from "../../api/compute-pool-api";
import {promises} from "fs";

class PackageService {
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

            const dependenciesByPackageId = await this.getPackagesDependenciesByPackageId(nodeIds, draftIdByNodeId);

            nodesListToExport = nodesListToExport.map(nodeToExport => {
                nodeToExport.dependencies = dependenciesByPackageId.get(nodeToExport.id);
                return nodeToExport;
            })
        }
        this.exportListOfPackages(nodesListToExport, fieldsToInclude);
    }

    public async batchExportPackages(packageKeys: string[], includeDependencies: boolean): Promise<void> {
        const fieldsToInclude = ["key", "name", "changeDate", "activatedDraftId", "spaceId"];
        const allPackages = await packageApi.findAllPackages();
        let nodesListToExport: BatchExportNodeTransport[] = allPackages.filter(node => packageKeys.includes(node.key));
        const actionFlowsPackageKeys = (await nodeApi.findAllNodesOfType("SCENARIO")).map(node=>node.rootNodeKey);
        nodesListToExport = nodesListToExport.filter(node => !actionFlowsPackageKeys.includes(node.key));

        if(includeDependencies) {
            fieldsToInclude.push("type", "value", "dependencies", "id", "version", "poolId", "node", "dataModelId", "dataPool", "datamodels", "variables", "space");

            nodesListToExport = await this.fillNodeDependencies(nodesListToExport, allPackages);

            this.exportManifestOfPackages(nodesListToExport);
            this.exportPackagesAndAssets(nodesListToExport);
        } else {
            this.exportListOfPackages(nodesListToExport, fieldsToInclude);
        }
    }

    public async getPackagesDependenciesByPackageId(nodeIds: string[], draftIdByNodeId: Map<string, string>): Promise<Map<string, PackageDependencyTransport[]>> {
        const dependenciesByPackageId = new Map<string, PackageDependencyTransport[]>();
        const packageWithDependencies = await this.getPackagesWithDependencies(nodeIds, draftIdByNodeId);

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

    public async getPackagesWithDependencies(nodeIds: string[], draftIdByNodeId: Map<string, string>): Promise<PackageDependencyTransport[]> {
        const promises = [];

        nodeIds.forEach(async nodeId => promises.push(packageDependenciesApi.findDependenciesOfPackage(nodeId, draftIdByNodeId.get(nodeId))));
        const results = await Promise.all(promises);

        const dependencies: PackageDependencyTransport[] = [];
        results.forEach(result => dependencies.push(...result));

        return dependencies;
    }

    private async fillNodeDependencies(nodesListToExport: BatchExportNodeTransport[], allPackages: ContentNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        nodesListToExport = await this.getVersionOfPackages(nodesListToExport);

        const draftIdByNodeId = new Map<string, string>();
        const nodeIds = nodesListToExport.map(node => {
            draftIdByNodeId.set(node.id, node.workingDraftId);
            return node.id;
        });

        const dependenciesByPackageId = await this.getPackagesDependenciesByPackageId(nodeIds, draftIdByNodeId);

        nodesListToExport = nodesListToExport.map(nodeToExport => {
            nodeToExport.dependencies = dependenciesByPackageId.get(nodeToExport.id) ?? [];
            return nodeToExport;
        })

        await variableService.getVariablesByNodeKey(nodesListToExport);
        nodesListToExport = await dataModelService.getDatamodelsForNodes(nodesListToExport);
        nodesListToExport = await spaceService.getParentSpaces(nodesListToExport);

        nodesListToExport = await this.getNodeDependecies(nodesListToExport, allPackages);
        return nodesListToExport
    }

    private async getNodeDependecies(nodesListToExport: BatchExportNodeTransport[], allPackages: ContentNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        for(const node of nodesListToExport) {
            const nodesToGetKeys = node.dependencies.filter(dependency=> !nodesListToExport
                    .map(node=> node.key)
                    .includes(dependency.key))
                .map(dependency=>dependency.key);
            if(nodesToGetKeys.length > 0) {
                let dependencyNodes = allPackages.filter(packageNode=> nodesToGetKeys.includes(packageNode.key));
                dependencyNodes = await this.fillNodeDependencies(dependencyNodes, allPackages);
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

    private exportPackagesAndAssets(nodes: BatchExportNodeTransport[]): void {
        for(const node of nodes) {
            fileService.writeToFileWithGivenName(JSON.stringify(node as unknown as ContentNodeTransport), node.key + ".json");
        }
    }

    private exportManifestOfPackages(nodes: BatchExportNodeTransport[]): void {
        const manifestNodes: ManifestNodeTransport[] = [];
        nodes.forEach((node)=> {
          const manifestNode = {} as ManifestNodeTransport;
          manifestNode.packageKey = node.key;
          manifestNode.space = {
              spaceName: node.space.name,
              spaceIcon: node.space.iconReference
          }
          manifestNode.variables = node.variables.filter(variable=>variable.type === "DATA_MODEL").map((variable)=> {
              // @ts-ignore
              const dataModel = node.datamodels.find(dataModel => dataModel.node.dataModelId === variable.value);
              // logger.info(dataModel);
              return {
                  variableName: variable.key,
                  dataModelName: dataModel?.node.name,
                  dataPoolName: dataModel?.dataPool.name
              }
          });
          manifestNode.dependencies = node.dependencies.map(dependency => {
            return {
                packageKey: dependency.key,
                version: dependency.version
            }
          });
          manifestNodes.push(manifestNode);
        })

        fileService.writeToFileWithGivenName(JSON.stringify(manifestNodes), "manifest.json");
    }
}

export const packageService = new PackageService();
