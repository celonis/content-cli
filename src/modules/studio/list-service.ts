import { logger } from "../../util/logger";
import { v4 as uuidv4 } from "uuid";
import { FileService, fileService } from "../../services/file-service";
import { BatchExportNodeTransport } from "../../interfaces/batch-export-node-transport";
import { dataModelService } from "../../services/package-manager/datamodel-service";
import { PackageDependencyTransport, PackageManagerVariableType } from "../../interfaces/package-manager.interfaces";
import { variableService } from "../../services/package-manager/variable-service";
import AdmZip = require("adm-zip");
import {packageDependenciesApi} from "../../api/package-dependencies-api";
import { Context } from "../../core/cli-context";
import { ListApi } from "./list-api";

export class ListService {
    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    listApi : ListApi;
    constructor(private context: Context) {
        this.listApi = new ListApi(context);
    }

    public async listPackages(): Promise<void> {
        const nodes = await this.listApi.findAllPackages();
        nodes.forEach(node => {
            logger.info(`${node.name} - Key: "${node.key}"`);
        });
        logger.info(`Found ${nodes.length} package(s)`);
    }

    public async findAndExportListOfAllPackages(includeDependencies: boolean, packageKeys: string[]): Promise<void> {
        const fieldsToInclude = ["key", "name", "changeDate", "activatedDraftId", "workingDraftId", "spaceId"];

        let nodesListToExport: BatchExportNodeTransport[] = await this.listApi.findAllPackages();
        if (packageKeys.length > 0) {
            nodesListToExport = nodesListToExport.filter(node => packageKeys.includes(node.rootNodeKey));
        }

        if (includeDependencies) {
            fieldsToInclude.push("type", "value", "dependencies", "id", "updateAvailable", "version", "poolId", "node", "dataModelId", "dataPool", "datamodels");
            const unPublishedNodes = nodesListToExport.filter(node => !node.activatedDraftId);
            let publishedNodes = nodesListToExport.filter(node => node.activatedDraftId);
            publishedNodes = await this.getNodesWithActiveVersion(publishedNodes);
            nodesListToExport = [...publishedNodes, ...unPublishedNodes];

            const packageWithDataModelVariableAssignments = await variableService.getVariableAssignmentsForNodes(PackageManagerVariableType.DATA_MODEL);
            const dataModelDetailsByNode = await dataModelService.getDataModelDetailsForPackages(packageWithDataModelVariableAssignments);
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

    public async getPackagesWithDependencies(draftIdByNodeId: Map<string, string>): Promise<Map<string, PackageDependencyTransport[]>> {
        const allPackageDependencies: Map<string, PackageDependencyTransport[]> = await packageDependenciesApi.findPackageDependenciesByIds(draftIdByNodeId);
        return allPackageDependencies;
    }

    private exportListOfPackages(nodes: BatchExportNodeTransport[], fieldsToInclude: string[]): void {
        const filename = uuidv4() + ".json";
        fileService.writeToFileWithGivenName(JSON.stringify(nodes, fieldsToInclude), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }

    public async getNodesWithActiveVersion(nodes: BatchExportNodeTransport[]): Promise<BatchExportNodeTransport[]> {
        const activeVersionsOfPackage = await this.listApi.findActiveVersionByIds(nodes.map(node => node.id));

        nodes.forEach(node => {
            node.version = activeVersionsOfPackage.find(packageVersion => packageVersion.id === node.id);
        })

        return nodes;
    }

}

