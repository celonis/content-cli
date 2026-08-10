import { v4 as uuidv4 } from "uuid";
import { Context } from "../../../core/command/cli-context";
import { fileService, FileService } from "../../../core/utils/file-service";
import { CuiFileService } from "../../../core/utils/cui-file-service";
import { logger } from "../../../core/utils/logger";
import { BranchApi } from "./api/branch.api";
import {
    BranchTransport,
    BranchingSettingsTransport,
    CreateBranchTransport,
    MergeApplyOptions,
    MergeBranchTransport,
    MergeDiffTransport,
    MergePreviewRequestTransport,
    MergePreviewTransport,
    MergeStatus,
    PackageVersionCreatedTransport,
    SavePackageVersionTransport,
    VersionBumpOption,
} from "./interfaces/branch.interfaces";

export class BranchCommandService {
    private readonly branchApi: BranchApi;
    private readonly cuiFileService: CuiFileService;

    constructor(context: Context) {
        this.branchApi = new BranchApi(context);
        this.cuiFileService = new CuiFileService(context);
    }

    public async setBranchingEnabled(packageKey: string, enabled: boolean, jsonResponse: boolean): Promise<BranchingSettingsTransport> {
        const transport: BranchingSettingsTransport = { branchingEnabled: enabled };
        const result = await this.branchApi.configureBranchingSettings(packageKey, transport);

        if (jsonResponse) {
            await this.writeJson(result);
        } else {
            logger.info(`Branching ${result.branchingEnabled ? "enabled" : "disabled"} for package ${packageKey}.`);
        }
        return result;
    }

    public async createBranch(packageKey: string, branchKey: string, sourceVersion: string, validate: boolean, jsonResponse: boolean): Promise<BranchTransport | void> {
        const transport: CreateBranchTransport = { branchKey, version: sourceVersion };
        const result = await this.branchApi.createBranch(packageKey, transport, validate);

        if (validate) {
            logger.info(`Validation successful for branch '${branchKey}' from ${packageKey}@${sourceVersion}.`);
            return;
        }

        if (jsonResponse) {
            await this.writeJson(result);
        } else if (result) {
            BranchCommandService.printBranch(result);
        }
        return result;
    }

    public async listBranches(packageKey: string, jsonResponse: boolean): Promise<BranchTransport[]> {
        const branches = await this.branchApi.listBranches(packageKey);

        if (jsonResponse) {
            await this.writeJson(branches);
        } else if (branches.length === 0) {
            logger.info(`No branches found for ${packageKey}.`);
        } else {
            branches.forEach(branch => {
                logger.info(
                    `${branch.branchKey} (package: ${branch.packageKey}, source: ${branch.sourcePackageKey}@${branch.sourceVersion})`
                );
            });
        }
        return branches;
    }

    public async deleteBranch(packageKey: string, branchKey: string): Promise<void> {
        const branchPackageKey = `${packageKey}@${branchKey}`;
        await this.branchApi.deleteBranch(branchPackageKey);
        logger.info(`Branch ${branchPackageKey} deleted.`);
    }

    public async mergePreview(targetPackageKey: string, sourceKey: string, sourceVersion: string, jsonResponse: boolean): Promise<MergePreviewTransport> {
        const transport: MergePreviewRequestTransport = { sourceKey, sourceVersion };
        const preview = await this.branchApi.mergePreview(targetPackageKey, transport);

        if (jsonResponse) {
            await this.writeJson(preview);
        } else {
            BranchCommandService.printPreviewSummary(targetPackageKey, sourceKey, sourceVersion, preview);
        }
        return preview;
    }

    public async mergeApply(targetPackageKey: string, options: MergeApplyOptions): Promise<PackageVersionCreatedTransport> {
        const rawBody: Partial<MergeBranchTransport> = options.file
            ? JSON.parse(fileService.readFile(options.file))
            : {};

        const effectiveSourceKey = options.sourceKey ?? rawBody.sourceKey;
        const effectiveSourceVersion = options.sourceVersion ?? rawBody.sourceVersion;

        const versionCreate = BranchCommandService.buildVersionCreate(
            rawBody.versionCreate,
            options.bump,
            options.version,
            options.summary,
            effectiveSourceKey,
            effectiveSourceVersion,
        );

        const transport: MergeBranchTransport = {
            ...rawBody,
            sourceKey: effectiveSourceKey,
            sourceVersion: effectiveSourceVersion,
            versionCreate,
        };
        const result = await this.branchApi.merge(targetPackageKey, transport);

        if (options.jsonResponse) {
            await this.writeJson(result);
        } else {
            logger.info(
                `Merge applied: published ${result.packageKey}@${result.version} from ${effectiveSourceKey}@${effectiveSourceVersion}.`
            );
        }
        return result;
    }

    private static buildVersionCreate(
        fromFile: SavePackageVersionTransport | undefined,
        flagBump: string | undefined,
        flagVersion: string | undefined,
        flagSummary: string | undefined,
        sourceKey: string | undefined,
        sourceVersion: string | undefined,
    ): SavePackageVersionTransport {
        const versionCreate: SavePackageVersionTransport = fromFile ? { ...fromFile } : {};

        if (flagVersion !== undefined) {
            versionCreate.version = flagVersion;
            versionCreate.versionBumpOption = undefined;
        } else if (flagBump !== undefined) {
            versionCreate.versionBumpOption = flagBump.toUpperCase() as SavePackageVersionTransport["versionBumpOption"];
            versionCreate.version = undefined;
        } else if (!versionCreate.version && !versionCreate.versionBumpOption) {
            versionCreate.versionBumpOption = VersionBumpOption.PATCH;
        }

        if (flagSummary !== undefined) {
            versionCreate.summaryOfChanges = flagSummary;
        } else if (!versionCreate.summaryOfChanges && sourceKey && sourceVersion) {
            versionCreate.summaryOfChanges = `Merge ${sourceKey}@${sourceVersion}`;
        }

        return versionCreate;
    }

    private async writeJson(payload: unknown): Promise<void> {
        const filename = `${uuidv4()}.json`;
        const writtenFilename = await this.cuiFileService.writeToFileWithGivenName(JSON.stringify(payload, null, 2), filename);
        logger.info(FileService.fileDownloadedMessage + writtenFilename);
    }

    private static printBranch(branch: BranchTransport): void {
        logger.info(`Main Package Key: ${branch.projectKey}`);
        logger.info(`Branch Key: ${branch.branchKey}`);
        logger.info(`Package Key: ${branch.packageKey}`);
        logger.info(`Source Package Key: ${branch.sourcePackageKey}`);
        logger.info(`Source Version: ${branch.sourceVersion}`);
    }

    private static printPreviewSummary(targetPackageKey: string, sourceKey: string, sourceVersion: string, preview: MergePreviewTransport): void {
        logger.info(`Preview: merge ${sourceKey}@${sourceVersion} into ${targetPackageKey}`);
        logger.info(`Common ancestor: ${preview.commonPackageKey}@${preview.commonVersion}`);
        const totalNodes = preview.nodeChanges?.length ?? 0;
        const packageConflictPaths = BranchCommandService.countConflictPaths(preview.packageChanges?.changes);
        const nodeConflictPaths =
            preview.nodeChanges?.reduce((sum, node) => sum + BranchCommandService.countConflictPaths(node.changes), 0) ?? 0;
        const conflicts = packageConflictPaths + nodeConflictPaths;
        const nodesNeedingResolution =
            preview.nodeChanges?.filter(node => BranchCommandService.isInConflict(node.changes)).length ?? 0;

        logger.info(`Nodes touched: ${totalNodes}, conflicting paths: ${conflicts}, nodes needing resolution: ${nodesNeedingResolution}.`);
        if (BranchCommandService.isInConflict(preview.packageChanges?.changes)) {
            logger.info("The package's own configuration or metadata is in conflict. Supply 'resolvedPackageConflict' before applying.");
        }
        if (nodesNeedingResolution > 0 && nodeConflictPaths === 0) {
            logger.info("The conflicts above are structural (a node exists on one side only), so no path-level diff is reported. Supply a resolution for each node before applying.");
        }
    }

    private static countConflictPaths(changes: MergeDiffTransport | undefined): number {
        return (changes?.configuration?.conflicts?.length ?? 0) + (changes?.metadata?.conflicts?.length ?? 0);
    }

    private static isInConflict(changes: MergeDiffTransport | undefined): boolean {
        return changes?.configuration?.status === MergeStatus.CONFLICT || changes?.metadata?.status === MergeStatus.CONFLICT;
    }
}
