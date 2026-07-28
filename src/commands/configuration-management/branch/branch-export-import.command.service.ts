import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";
import AdmZip = require("adm-zip");
import * as FormData from "form-data";
import { Readable } from "node:stream";
import { resolve } from "node:path";
import { Context } from "../../../core/command/cli-context";
import { fileService, FileService } from "../../../core/utils/file-service";
import { FatalError, logger } from "../../../core/utils/logger";
import { GitService } from "../../../core/git-profile/git/git.service";
import { SinglePackageExportApi } from "../api/single-package-export-api";
import { SinglePackageImportApi } from "../api/single-package-import-api";
import { BranchApi } from "./api/branch.api";
import { BranchUtils } from "../../../core/utils/branches";
import { BranchSyncSummary, BranchTransport } from "./interfaces/branch.interfaces";

const PACKAGE_FILE = "package.json";
const MAX_UNCOMPRESSED_ZIP_SIZE = 4 * 1024 * 1024 * 1024;

export interface BranchExportOptions {
    zip?: boolean;
    gitEnabled?: boolean;
    jsonResponse?: boolean;
}

export interface BranchImportOptions {
    file?: string;
    directory?: string;
    overwrite?: boolean;
    gitEnabled?: boolean;
    jsonResponse?: boolean;
}

export class BranchExportImportCommandService {

    private readonly singlePackageExportApi: SinglePackageExportApi;
    private readonly singlePackageImportApi: SinglePackageImportApi;
    private readonly branchApi: BranchApi;
    private readonly gitService: GitService;

    constructor(context: Context) {
        this.singlePackageExportApi = new SinglePackageExportApi(context);
        this.singlePackageImportApi = new SinglePackageImportApi(context);
        this.branchApi = new BranchApi(context);
        this.gitService = new GitService(context);
    }

    public async exportBranch(packageKey: string, branchKey: string, options: BranchExportOptions = {}): Promise<void> {
        const jsonResponse = !!options.jsonResponse;

        if (options.gitEnabled) {
            const pushedKey = await this.pushBranchToGit(packageKey, branchKey);
            if (jsonResponse) {
                BranchExportImportCommandService.writeJson({ packageKey: pushedKey, branchName: branchKey });
            } else {
                logger.info(`Exported ${pushedKey} to Git branch '${branchKey}'.`);
            }
            return;
        }

        const branchPackageKey = BranchUtils.constructBranchKey(packageKey, branchKey);
        const sourceDir = await this.exportRewrittenPackageDir(branchPackageKey);
        try {
            const message = this.writeLocalArtifact(sourceDir, packageKey, !!options.zip);
            if (jsonResponse) {
                BranchExportImportCommandService.writeJson({ packageKey: branchPackageKey, branchName: branchKey });
            } else {
                logger.info(message);
            }
        } finally {
            this.removeDir(sourceDir);
        }
    }

    public async exportAll(packageKey: string, jsonResponse: boolean = false): Promise<void> {
        const mainKey = BranchUtils.extractProjectKey(packageKey);
        const branches: BranchTransport[] = await this.branchApi.listBranches(mainKey);

        const synced: string[] = [];
        await this.pushMainPackage(mainKey);
        synced.push(mainKey);
        // listBranches also reports the main package itself, whose packageKey carries no
        // branch suffix. It is already pushed above, and it has no '<mainKey>@<branchKey>'
        // package to export, so exporting it as a branch would fail.
        for (const branch of branches.filter(entry => BranchUtils.isBranchPackageKey(entry.packageKey))) {
            const pushedKey = await this.pushBranchToGit(mainKey, branch.branchKey);
            synced.push(pushedKey);
            if (!jsonResponse) {
                logger.info(`Exported ${pushedKey} to Git branch '${branch.branchKey}'.`);
            }
        }

        const summary: BranchSyncSummary = { packageKey: mainKey, branchName: BranchUtils.MAIN_BRANCH_KEY, synced };
        if (jsonResponse) {
            BranchExportImportCommandService.writeJson(summary);
        } else {
            logger.info(`Exported Git mirror for ${mainKey}: ${synced.length} package(s) pushed.`);
        }
    }

    public async importBranch(packageKey: string, branchKey: string, options: BranchImportOptions = {}): Promise<void> {
        const branchPackageKey = BranchUtils.constructBranchKey(packageKey, branchKey);

        const workingDir = options.gitEnabled
            ? await this.gitService.pullFromBranch(branchKey)
            : this.prepareLocalWorkingDir(options.file, options.directory);
        try {
            this.restoreBranchKey(workingDir, packageKey, branchPackageKey);
            await this.importPackageSourceDir(workingDir, !!options.overwrite);

            if (options.jsonResponse) {
                BranchExportImportCommandService.writeJson({ packageKey: branchPackageKey, branchName: branchKey });
            } else {
                const origin = options.gitEnabled ? `Git branch '${branchKey}'` : (options.file ?? options.directory);
                logger.info(`Imported ${origin} into ${branchPackageKey}.`);
            }
        } finally {
            this.removeDir(workingDir);
        }
    }

    private async pushBranchToGit(mainKey: string, branchKey: string): Promise<string> {
        const branchPackageKey = BranchUtils.constructBranchKey(mainKey, branchKey);
        const sourceDir = await this.exportRewrittenPackageDir(branchPackageKey);
        try {
            await this.gitService.pushToBranch(sourceDir, branchKey);
            return branchPackageKey;
        } finally {
            this.removeDir(sourceDir);
        }
    }

    private async pushMainPackage(mainKey: string): Promise<void> {
        const packageData = await this.singlePackageExportApi.exportPackage(mainKey);
        const extractedDir = fileService.extractZipBufferToTempDirectory(packageData);
        try {
            await this.gitService.pushToBranch(extractedDir, BranchUtils.MAIN_BRANCH_KEY);
        } finally {
            this.removeDir(extractedDir);
        }
    }

    private async exportRewrittenPackageDir(branchPackageKey: string): Promise<string> {
        const packageData = await this.singlePackageExportApi.exportPackage(branchPackageKey);
        const extractedDir = fileService.extractZipBufferToTempDirectory(packageData);
        const projectKey = BranchUtils.extractProjectKey(branchPackageKey);
        this.normalizeToProjectKey(extractedDir, branchPackageKey, projectKey);
        return extractedDir;
    }

    private writeLocalArtifact(sourceDir: string, packageKey: string, zip: boolean): string {
        if (zip) {
            const zipPath = fileService.zipDirectoryAsSinglePackage(sourceDir);
            try {
                const fileName = `${packageKey}.zip`;
                fileService.writeBufferToFileWithGivenName(fs.readFileSync(zipPath), resolve(process.cwd(), fileName));
                return FileService.fileDownloadedMessage + fileName;
            } finally {
                fs.rmSync(zipPath, { force: true });
            }
        }
        const targetDir = resolve(process.cwd(), packageKey);
        fs.rmSync(targetDir, { recursive: true, force: true });
        fs.cpSync(sourceDir, targetDir, { recursive: true });
        return `Successful export. Exported directory: ${packageKey}`;
    }

    private prepareLocalWorkingDir(file: string | undefined, directory: string | undefined): string {
        const workingDir = fs.mkdtempSync(path.join(os.tmpdir(), "content-cli-"));
        if (directory) {
            if (!fileService.isDirectory(directory)) {
                fs.rmSync(workingDir, { recursive: true, force: true });
                throw new FatalError("The --directory option accepts only directories.");
            }
            fs.cpSync(directory, workingDir, { recursive: true });
            return workingDir;
        }
        if (fileService.isDirectory(file)) {
            fs.rmSync(workingDir, { recursive: true, force: true });
            throw new FatalError("The --file option accepts only zip files.");
        }
        new AdmZip(file).extractAllTo(workingDir, true);
        return workingDir;
    }

    private async importPackageSourceDir(sourceDir: string, overwrite: boolean): Promise<void> {
        const zipPath = fileService.zipDirectoryAsSinglePackage(sourceDir);
        try {
            const packageZip = new AdmZip(zipPath);
            this.assertUncompressedSizeWithinLimit(packageZip, zipPath);
            const formData = new FormData();
            formData.append("packageFile", this.toReadable(packageZip), { filename: "package.zip" });
            await this.singlePackageImportApi.importPackage(formData, overwrite);
        } finally {
            fs.rmSync(zipPath, { force: true });
        }
    }

    // The export source is a fresh Pacman export of the branch package, so a key that does not
    // match is a no-op rather than a failure: the worst case is a mirror diff that still carries
    // the branch suffix, and nothing outside the local working copy is touched.
    private normalizeToProjectKey(dir: string, from: string, to: string): void {
        if (from === to) {
            return;
        }
        const filePath = path.join(dir, PACKAGE_FILE);
        if (!fs.existsSync(filePath)) {
            return;
        }
        const raw = fs.readFileSync(filePath, { encoding: "utf-8" });
        const json = JSON.parse(raw);
        if (json.key !== from) {
            return;
        }
        const updated = this.replaceFieldValue(raw, "key", from, to);
        if (updated !== raw) {
            fs.writeFileSync(filePath, updated, { encoding: "utf-8" });
        }
    }

    // The import source is caller-supplied and the import endpoint derives the target package
    // solely from package.json#key, so a key that is neither the project key nor the branch key
    // must abort rather than silently import into whatever package the source names.
    private restoreBranchKey(dir: string, projectKey: string, branchPackageKey: string): void {
        const filePath = path.join(dir, PACKAGE_FILE);
        if (!fs.existsSync(filePath)) {
            throw new FatalError(`The import source does not contain a ${PACKAGE_FILE} file.`);
        }

        const raw = fs.readFileSync(filePath, { encoding: "utf-8" });
        const sourceKey = JSON.parse(raw).key;
        if (sourceKey === branchPackageKey) {
            return;
        }
        if (sourceKey !== projectKey) {
            throw new FatalError(
                `The import source declares package key '${sourceKey}', but importing into '${branchPackageKey}' requires '${projectKey}' or '${branchPackageKey}'. Nothing was imported.`
            );
        }

        const updated = this.replaceFieldValue(raw, "key", projectKey, branchPackageKey);
        if (updated === raw) {
            throw new FatalError(
                `Could not rewrite the package key in ${PACKAGE_FILE} from '${projectKey}' to '${branchPackageKey}'. Nothing was imported.`
            );
        }
        fs.writeFileSync(filePath, updated, { encoding: "utf-8" });
    }

    private replaceFieldValue(content: string, field: string, from: string, to: string): string {
        const pattern = new RegExp(String.raw`("${this.escapeRegExp(field)}"\s*:\s*)"${this.escapeRegExp(from)}"`);
        return content.replace(pattern, `$1"${to}"`);
    }

    private escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, match => "\\" + match);
    }

    private assertUncompressedSizeWithinLimit(packageZip: AdmZip, sourcePath: string): void {
        const totalBytes = packageZip.getEntries().reduce((sum, entry) => sum + entry.header.size, 0);
        if (totalBytes > MAX_UNCOMPRESSED_ZIP_SIZE) {
            throw new FatalError(
                `Failed to handle "${sourcePath}": uncompressed size ${(totalBytes / (1024 ** 3)).toFixed(2)} GB exceeds the 4 GB limit.`
            );
        }
    }

    private toReadable(packageZip: AdmZip): Readable {
        return new Readable({
            read(): void {
                this.push(packageZip.toBuffer());
                this.push(null);
            },
        });
    }

    private removeDir(dir: string): void {
        fs.rmSync(dir, { recursive: true, force: true });
    }

    private static writeJson(payload: unknown): void {
        const filename = `${uuidv4()}.json`;
        fileService.writeToFileWithGivenName(JSON.stringify(payload, null, 2), filename);
        logger.info(FileService.fileDownloadedMessage + filename);
    }
}
