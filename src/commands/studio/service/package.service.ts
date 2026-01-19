import {v4 as uuidv4} from "uuid";
import { Context } from "../../../core/command/cli-context";
import { PackageApi } from "../api/package-api";
import { logger } from "../../../core/utils/logger";
import {
    PackageDependencyTransport,
    PackageManagerVariableType,
} from "../interfaces/package-manager.interfaces";
import { FileService, fileService } from "../../../core/utils/file-service";
import { BatchExportNodeTransport } from "../interfaces/batch-export-node.interfaces";
import { PackageDependenciesApi } from "../api/package-dependencies-api";
import { DataModelService } from "./data-model.service";
import { StudioVariableService } from "./studio-variable.service";

export class PackageService {
    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    private packageApi: PackageApi;
    private packageDependenciesApi: PackageDependenciesApi;

    private dataModelService: DataModelService;
    private variableService: StudioVariableService;

    constructor(context: Context) {
        this.packageApi = new PackageApi(context);
        this.packageDependenciesApi = new PackageDependenciesApi(context);
        this.dataModelService = new DataModelService(context);
        this.variableService = new StudioVariableService(context);
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

    private exportListOfPackages(nodes: BatchExportNodeTransport[], fieldsToInclude: string[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(nodes, fieldsToInclude), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }
}
