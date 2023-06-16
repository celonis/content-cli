import {logger} from "../../util/logger";
import {packageApi} from "../../api/package-api";
import {v4 as uuidv4} from "uuid";
import {FileService, fileService} from "../file-service";
import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";
import {dataModelService} from "./datamodel-service";
import {
    ContentNodeTransport,
    PackageDependencyTransport,
    VariablesAssignments
} from "../../interfaces/package-manager.interfaces";
import {nodeApi} from "../../api/node-api";
import {packageDependenciesApi} from "../../api/package-dependencies-api";
import {variableService} from "./variable-service";
import {computePoolApi} from "../../api/compute-pool-api";
import {spaceApi} from "../../api/space-api";

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

    public async pullPackage(key: string,
                             store?: boolean,
                             newKey?: string,
                             draft?: boolean,
                             folderName?: string): Promise<void> {
        const exportedPackage = await packageApi.pullPackage(key, store, newKey, draft);

        const keyOfPackage = newKey ? newKey : key;
        const exportedFileName = fileService.writeStreamToFile(exportedPackage, keyOfPackage + "." + keyOfPackage, folderName);
        fileService.writeStreamToFile(exportedPackage, keyOfPackage + "." + keyOfPackage);

        logger.info(FileService.FILE_DOWNLOADED_MESSAGE + exportedFileName);
    }


    public async pullPackages(packageKeys: string[], includeDependencies: boolean): Promise<void> {
        const allPackages = await packageApi.findAllPackages();

        const packageIdsThatHaveAF = (await nodeApi.findAllNodesOfType("SCENARIO"))
            .map(actionFlow => actionFlow.rootNodeId);

        const filteredPackages = allPackages.filter(node => !packageIdsThatHaveAF.includes(node.id));

        const exportedPackages: ContentNodeTransport[] = [];

        const exportedPackageKeys: string[] = [];

        const randomFolderName = uuidv4();

        await fileService.createFolder(randomFolderName);

        const promises = [];
        packageKeys.forEach(async packageKey => {
            promises.push(
                new Promise(async resolve => {
                    if (!exportedPackageKeys.includes(packageKey)) {

                        const packageBeingExported = filteredPackages.filter(node => node.key === packageKey)[0];

                        if (includeDependencies) {
                            await this.pullPackageWithDependencies(packageBeingExported, exportedPackageKeys, exportedPackages, allPackages);
                            resolve();
                        } else {
                            await this.pullPackage(packageBeingExported.key, false, "", false, randomFolderName);
                            exportedPackages.push(packageBeingExported);
                            exportedPackageKeys.push(packageBeingExported.key);
                            resolve();
                        }
                    }
                })
            )
        })

        await Promise.all(promises);

        const variablesByNodeKey = await variableService.getVariablesByNodeKey();

        const secondPromises = [];
        const manifest = new Map<string, ExportManifest>();

        exportedPackages.forEach(exportedPackage => {

            secondPromises.push(
                new Promise(async resolve => {

                    const datamodelVariables = variablesByNodeKey.get(exportedPackage.key).filter(variable => variable.type === "DATA_MODEL");

                    const variablesByDatamodelId = new Map<string, VariablesAssignments>();

                    datamodelVariables.forEach(variable => {
                        variablesByDatamodelId.set(variable.value.toString(), variable);
                    })

                    const packageManifestEntry: ExportManifest = {
                        variables: []
                    };

                    if (datamodelVariables) {
                        const datamodels = await dataModelService.findAssignedDatamodels(exportedPackage.key);


                        datamodels.forEach(datamodel => {
                            const variable = variablesByDatamodelId.get(datamodel.node.dataModelId);


                            const variableInfo = {
                                varaibleName: variable.key,
                                datamodelName: datamodel.node.name,
                                datapoolName: datamodel.dataPool.name,
                            }

                            packageManifestEntry.variables.push(variableInfo);
                        })
                    }


                    const space = await spaceApi.findSpaceById(exportedPackage.spaceId);

                    packageManifestEntry.space = {
                        spaceName: space.name,
                        spaceIcon: space.spaceIcon,
                    }


                    manifest.set(exportedPackage.key, packageManifestEntry);
                    resolve();
                })
            )
        })

        await Promise.all(secondPromises);

        fileService.writeToFileWithGivenName(JSON.stringify(Object.fromEntries(manifest)), randomFolderName + '/manifest.json')
    }

    public async pullPackageWithDependencies(packageBeingExported: ContentNodeTransport, exportedKeys: string[], exportedPackages: ContentNodeTransport[], allPackages: ContentNodeTransport[]): Promise<void> {

        const dependenciesOfPackage = await packageDependenciesApi.findDependenciesOfPackage(packageBeingExported.id, packageBeingExported.workingDraftId);

        const promises = [];
        dependenciesOfPackage.forEach(async dependency => {
            promises.push(
                new Promise(async resolve => {

                    const dependencyPackage = allPackages.filter(node => node.key === dependency.key)[0];
                    const dependenciesOfDependency = await packageDependenciesApi.findDependenciesOfPackage(packageBeingExported.id, packageBeingExported.workingDraftId);

                    if (dependenciesOfDependency.length) {
                        await this.pullPackageWithDependencies(dependencyPackage, exportedKeys, exportedPackages, allPackages);
                    }
                     resolve();
                })
            )
        })

        await Promise.all(promises);
        exportedPackages.push(packageBeingExported);
        exportedKeys.push(packageBeingExported.key);
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

    private exportListOfPackages(nodes: BatchExportNodeTransport[], fieldsToInclude: string[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(nodes, fieldsToInclude), filename);
        logger.info(FileService.FILE_DOWNLOADED_MESSAGE + filename);
    }
}

interface ExportManifest {
    variables?: Array<{
        variableName?: string,
        datapoolName?: string,
        datamodelName?: string
    }>,
    dependencies?: [],
    space?: {
        spaceName?: string,
        spaceIcon?: string,
    }
}

export const packageService = new PackageService();
