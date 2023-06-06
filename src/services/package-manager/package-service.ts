import {logger} from "../../util/logger";
import {ContentNodeTransport, PackageDependencyTransport, packageManagerApi} from "../../api/package-manager-api";
import {v4 as uuidv4} from "uuid";
import {FileService, fileService} from "../file-service";
import {BatchExportNodeTransport} from "../../interfaces/batch-export-node-transport";
import {variableService} from "./variable-service";

class PackageService {
    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    public async listPackages(): Promise<void> {
        const nodes = await packageManagerApi.findAllPackages();
        nodes.forEach(node => {
            logger.info(`${node.name} - Key: "${node.key}"`);
        });
    }

    public async findAndExportAllPackages(includeDependencies: boolean): Promise<void> {
        const fieldsToInclude = ["key", "name", "changeDate", "activatedDraftId", "spaceId"];

        let nodesListToExport: BatchExportNodeTransport[] = await packageManagerApi.findAllPackages();

        if (includeDependencies) {
            fieldsToInclude.push("variables", "type", "value", "dependencies", "id", "version");

            const packagesKeyWithActionFlows = (await packageManagerApi.findAllNodesOfType("SCENARIO")).map(node => node.rootNodeKey);
            nodesListToExport = nodesListToExport.filter(node => {
                return !packagesKeyWithActionFlows.includes(node.rootNodeKey);
            })

            const variablesByNodeKey = await variableService.getVariablesByNodeKey();
            nodesListToExport.map(node => {
                    node.variables = variablesByNodeKey.get(node.key);
                    return node;
                }
            )

            const draftIdsByNodeId = new Map<string, string>();
            const nodeIds = nodesListToExport.map(node => {
                draftIdsByNodeId.set(node.id, node.workingDraftId);
                return node.id;
            });
            const dependenciesByPackageId = await this.getPackagesDependenciesByPackageId(nodeIds, draftIdsByNodeId);

            nodesListToExport = nodesListToExport.map(nodeToExport => {
                nodeToExport.dependencies = dependenciesByPackageId.get(nodeToExport.id);
                return nodeToExport;
            })
        }
        this.exportListOfPackages(nodesListToExport, fieldsToInclude);
    }

    public async getPackagesDependenciesByPackageId(nodeIds: string[], draftIdsByNodeId: Map<string, string>): Promise<Map<string, PackageDependencyTransport[]>> {
        const dependenciesByPackageKey = new Map<string, PackageDependencyTransport[]>();
        const packageWithDependencies = await this.getPackagesWithDependencies(nodeIds, draftIdsByNodeId);

        packageWithDependencies.forEach(packageWithDependency => {
            const dependenciesOfPackage = dependenciesByPackageKey.get(packageWithDependency.rootNodeId) ?? [];
            dependenciesOfPackage.push(packageWithDependency);
            dependenciesByPackageKey.set(packageWithDependency.rootNodeId, dependenciesOfPackage);
        });

        return dependenciesByPackageKey
    }

    public async getPackagesWithDependencies(nodeIds: string[], draftIdsByNodeId: Map<string, string>): Promise<PackageDependencyTransport[]> {
        const results = await Promise.all(nodeIds.map(async nodeId => {
            return packageManagerApi.findDependenciesOfPackage(nodeId, draftIdsByNodeId.get(nodeId));
        }))

        const dependencies: PackageDependencyTransport[] = [];

        results.forEach(packageDependencies => {
            dependencies.push(...packageDependencies);
        })

        return dependencies;
    }

    private exportListOfPackages(nodes: BatchExportNodeTransport[], fieldsToInclude: string[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(nodes, fieldsToInclude), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }
}

export const packageService = new PackageService();
