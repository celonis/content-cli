import { v4 as uuidv4 } from "uuid";
import { Context } from "../../../core/command/cli-context";
import { FileService } from "../../../core/utils/file-service";
import { CuiFileService } from "../../../core/utils/cui-file-service";
import { logger } from "../../../core/utils/logger";
import { BranchUtils } from "../../../core/utils/branches";
import { PointerApi } from "./api/pointer.api";
import { PackagePointerTransport, SetPackagePointerTransport } from "./interfaces/pointer.interfaces";

export class PointerCommandService {
    private readonly pointerApi: PointerApi;
    private readonly cuiFileService: CuiFileService;

    constructor(context: Context) {
        this.pointerApi = new PointerApi(context);
        this.cuiFileService = new CuiFileService(context);
    }

    public async setLive(
        packageKey: string,
        branchKey: string,
        jsonResponse: boolean,
    ): Promise<PackagePointerTransport | null> {
        PointerCommandService.requireMainPackageKey(packageKey);

        if (branchKey === BranchUtils.MAIN_BRANCH_KEY) {
            throw new Error(
                `'${BranchUtils.MAIN_BRANCH_KEY}' cannot be selected as LIVE. Select one of the package's branches.`,
            );
        }

        const branchPackageKey = BranchUtils.constructBranchKey(packageKey, branchKey);
        const transport: SetPackagePointerTransport = { branchPackageKey };
        const result = await this.pointerApi.setPointer(packageKey, transport);

        if (jsonResponse) {
            await this.writeJson(result);
        } else if (result) {
            PointerCommandService.printPointer(result);
        } else {
            logger.info(`${branchPackageKey} is now LIVE for ${packageKey}.`);
        }

        return result;
    }

    public async getLive(packageKey: string, jsonResponse: boolean): Promise<PackagePointerTransport | null> {
        PointerCommandService.requireMainPackageKey(packageKey);

        const { pointer, detail } = await this.pointerApi.getPointer(packageKey);

        if (jsonResponse) {
            await this.writeJson(pointer);
            return pointer;
        }

        if (pointer) {
            PointerCommandService.printPointer(pointer);
            return pointer;
        }

        logger.info(`No LIVE selection for ${packageKey}. Consumers read the main package.`);
        if (detail) {
            logger.info(detail);
        }

        return null;
    }

    private static requireMainPackageKey(packageKey: string): void {
        if (BranchUtils.isBranchPackageKey(packageKey)) {
            throw new Error(
                `--packageKey must be the main package key, without '@'. Received '${packageKey}'. ` +
                    `Pass the branch through --branchKey instead.`,
            );
        }
    }

    private static printPointer(pointer: PackagePointerTransport): void {
        logger.info(`Package Key: ${pointer.packageKey}`);
        logger.info(`Pointer Name: ${pointer.pointerName}`);
        logger.info(`Branch Package Key: ${pointer.branchPackageKey}`);
        if (pointer.updatedBy) {
            logger.info(`Updated By: ${pointer.updatedBy}`);
        }
        if (pointer.updatedAt) {
            logger.info(`Updated At: ${pointer.updatedAt}`);
        }
    }

    private async writeJson(payload: unknown): Promise<void> {
        const filename = `${uuidv4()}.json`;
        const writtenFilename = await this.cuiFileService.writeToFileWithGivenName(
            JSON.stringify(payload, null, 2),
            filename,
        );
        logger.info(FileService.fileDownloadedMessage + writtenFilename);
    }
}
