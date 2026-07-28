import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { v4 as uuid } from "uuid";
import { mockAxiosGet, mockAxiosPost, mockedPostRequestBodyByUrl } from "../../../utls/http-requests-mock";
import { BranchExportImportCommandService } from "../../../../src/commands/configuration-management/branch/branch-export-import.command.service";
import { testContext } from "../../../utls/test-context";
import { loggingTestTransport } from "../../../jest.setup";
import { FileService, fileService } from "../../../../src/core/utils/file-service";
import { GitService } from "../../../../src/core/git-profile/git/git.service";
import { BranchUtils } from "../../../../src/core/utils/branches";

jest.unmock("fs");
jest.unmock("node:fs");

const TEAM = "https://myTeam.celonis.cloud";
const MAIN_KEY = "my-package";
const BRANCH = "feature-a";
const BRANCH_KEY = "my-package@feature-a";

function exportUrl(packageKey: string): string {
    return `${TEAM}/pacman/api/core/staging/packages/${packageKey}/export-file`;
}

function branchesUrl(packageKey: string): string {
    return `${TEAM}/pacman/api/core/packages/${packageKey}/branches`;
}

const IMPORT_URL = `${TEAM}/pacman/api/core/staging/packages/import-file`;

function makeTempDir(): string {
    const dir = path.join(os.tmpdir(), `cc-git-test-${uuid()}`);
    fs.mkdirSync(path.join(dir, "nodes"), { recursive: true });
    return dir;
}

function seedPackageDir(dir: string, packageKey: string): void {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ key: packageKey, name: "My Package" }, null, 2));
    fs.writeFileSync(path.join(dir, "variables.json"), JSON.stringify([{ key: "v1" }], null, 2));
    fs.writeFileSync(path.join(dir, "nodes", "root.json"), JSON.stringify({
        key: "root", type: "FOLDER", packageNodeKey: packageKey, parentNodeKey: null,
    }, null, 2));
    fs.writeFileSync(path.join(dir, "nodes", "child.json"), JSON.stringify({
        key: "child", type: "VIEW", packageNodeKey: packageKey, parentNodeKey: packageKey,
    }, null, 2));
}

describe("config branch export/import", () => {

    let capturedPushDir: string | undefined;
    let cwdDir: string | undefined;

    afterEach(() => {
        jest.restoreAllMocks();
        if (cwdDir) {
            fs.rmSync(cwdDir, { recursive: true, force: true });
            cwdDir = undefined;
        }
        capturedPushDir = undefined;
    });

    function arrangeExport(packageKey: string): void {
        mockAxiosGet(exportUrl(packageKey), Buffer.from("ignored-zip"));
        const exportedDir = makeTempDir();
        seedPackageDir(exportedDir, packageKey);
        jest.spyOn(FileService.prototype, "extractZipBufferToTempDirectory").mockReturnValue(exportedDir);
    }

    function capturePush(): void {
        jest.spyOn(GitService.prototype, "pushToBranch").mockImplementation(async (sourceDir: string) => {
            const snapshot = path.join(os.tmpdir(), `cc-git-pushed-${uuid()}`);
            fs.cpSync(sourceDir, snapshot, { recursive: true });
            capturedPushDir = snapshot;
        });
    }

    function useTempCwd(): string {
        cwdDir = path.join(os.tmpdir(), `cc-git-cwd-${uuid()}`);
        fs.mkdirSync(cwdDir, { recursive: true });
        jest.spyOn(process, "cwd").mockReturnValue(cwdDir);
        return cwdDir;
    }

    function readNode(dir: string, name: string): any {
        return JSON.parse(fs.readFileSync(path.join(dir, "nodes", name), "utf-8"));
    }

    describe("export to Git", () => {
        it("pushes to the Git branch named after branchKey and rewrites only package.json#key", async () => {
            arrangeExport(BRANCH_KEY);
            capturePush();

            await new BranchExportImportCommandService(testContext).exportBranch(MAIN_KEY, BRANCH, { gitEnabled: true });

            const pushToBranch = GitService.prototype.pushToBranch as jest.Mock;
            expect(pushToBranch).toHaveBeenCalledTimes(1);
            expect(pushToBranch.mock.calls[0][1]).toEqual(BRANCH);

            const pkg = JSON.parse(fs.readFileSync(path.join(capturedPushDir!, "package.json"), "utf-8"));
            expect(pkg.key).toEqual(MAIN_KEY);
            expect(loggingTestTransport.logMessages.some(m => m.message.includes(`Exported ${BRANCH_KEY} to Git branch '${BRANCH}'`))).toBe(true);
        });

        it("does not rewrite node keys (backend omits them when equal to the package key)", async () => {
            arrangeExport(BRANCH_KEY);
            capturePush();

            await new BranchExportImportCommandService(testContext).exportBranch(MAIN_KEY, BRANCH, { gitEnabled: true });

            expect(readNode(capturedPushDir!, "child.json").packageNodeKey).toEqual(BRANCH_KEY);
            expect(readNode(capturedPushDir!, "child.json").parentNodeKey).toEqual(BRANCH_KEY);
        });

        it("rewrites only the key value and preserves the file's original formatting", async () => {
            const exportedDir = makeTempDir();
            const originalPackageJson = [
                "{",
                `  "key" : "${BRANCH_KEY}",`,
                '  "name" : "My Package",',
                '  "configuration" : {',
                '    "variables" : [ ]',
                "  }",
                "}",
            ].join("\n");
            fs.writeFileSync(path.join(exportedDir, "package.json"), originalPackageJson);
            mockAxiosGet(exportUrl(BRANCH_KEY), Buffer.from("ignored-zip"));
            jest.spyOn(FileService.prototype, "extractZipBufferToTempDirectory").mockReturnValue(exportedDir);
            capturePush();

            await new BranchExportImportCommandService(testContext).exportBranch(MAIN_KEY, BRANCH, { gitEnabled: true });

            const expected = originalPackageJson.replace(`"${BRANCH_KEY}"`, `"${MAIN_KEY}"`);
            expect(fs.readFileSync(path.join(capturedPushDir!, "package.json"), "utf-8")).toEqual(expected);
        });

        it("writes a JSON summary file when jsonResponse=true", async () => {
            arrangeExport(BRANCH_KEY);
            capturePush();
            const writeSpy = jest.spyOn(fileService, "writeToFileWithGivenName").mockImplementation(() => undefined);

            await new BranchExportImportCommandService(testContext).exportBranch(MAIN_KEY, BRANCH, { gitEnabled: true, jsonResponse: true });

            expect(writeSpy).toHaveBeenCalledTimes(1);
            const summary = JSON.parse(writeSpy.mock.calls[0][0] as string);
            expect(summary.packageKey).toEqual(BRANCH_KEY);
            expect(summary.branchName).toEqual(BRANCH);
        });
    });

    describe("export locally", () => {
        it("writes an unzipped <packageKey> directory with the key rewritten and no Git push", async () => {
            arrangeExport(BRANCH_KEY);
            const pushSpy = jest.spyOn(GitService.prototype, "pushToBranch").mockResolvedValue();
            const cwd = useTempCwd();

            await new BranchExportImportCommandService(testContext).exportBranch(MAIN_KEY, BRANCH, {});

            expect(pushSpy).not.toHaveBeenCalled();
            const outDir = path.join(cwd, MAIN_KEY);
            expect(fs.existsSync(outDir)).toBe(true);
            const pkg = JSON.parse(fs.readFileSync(path.join(outDir, "package.json"), "utf-8"));
            expect(pkg.key).toEqual(MAIN_KEY);
            expect(readNode(outDir, "child.json").parentNodeKey).toEqual(BRANCH_KEY);
            expect(loggingTestTransport.logMessages.some(m => m.message.includes(`Exported directory: ${MAIN_KEY}`))).toBe(true);
        });

        it("writes a <packageKey>.zip when --zip is set", async () => {
            arrangeExport(BRANCH_KEY);
            const pushSpy = jest.spyOn(GitService.prototype, "pushToBranch").mockResolvedValue();
            const cwd = useTempCwd();

            await new BranchExportImportCommandService(testContext).exportBranch(MAIN_KEY, BRANCH, { zip: true });

            expect(pushSpy).not.toHaveBeenCalled();
            expect(fs.existsSync(path.join(cwd, `${MAIN_KEY}.zip`))).toBe(true);
        });

        it("writes a JSON summary instead of logging when jsonResponse=true", async () => {
            arrangeExport(BRANCH_KEY);
            jest.spyOn(GitService.prototype, "pushToBranch").mockResolvedValue();
            const cwd = useTempCwd();
            const writeSpy = jest.spyOn(fileService, "writeToFileWithGivenName").mockImplementation(() => undefined);

            await new BranchExportImportCommandService(testContext).exportBranch(MAIN_KEY, BRANCH, { jsonResponse: true });

            expect(fs.existsSync(path.join(cwd, MAIN_KEY))).toBe(true);
            expect(writeSpy).toHaveBeenCalledTimes(1);
            const summary = JSON.parse(writeSpy.mock.calls[0][0] as string);
            expect(summary.packageKey).toEqual(BRANCH_KEY);
            expect(summary.branchName).toEqual(BRANCH);
            expect(loggingTestTransport.logMessages.some(m => m.message.includes(`Exported directory: ${MAIN_KEY}`))).toBe(false);
        });
    });

    describe("export --all", () => {
        it("pushes the main package (untouched) and every branch (rewritten)", async () => {
            mockAxiosGet(branchesUrl(MAIN_KEY), [
                { packageKey: BRANCH_KEY, branchKey: BRANCH, projectKey: MAIN_KEY, sourcePackageKey: MAIN_KEY, sourceVersion: "1.0.0" },
            ]);
            mockAxiosGet(exportUrl(MAIN_KEY), Buffer.from("zip"));
            mockAxiosGet(exportUrl(BRANCH_KEY), Buffer.from("zip"));
            jest.spyOn(FileService.prototype, "extractZipBufferToTempDirectory").mockImplementation(() => {
                const dir = makeTempDir();
                seedPackageDir(dir, MAIN_KEY);
                return dir;
            });
            const pushSpy = jest.spyOn(GitService.prototype, "pushToBranch").mockResolvedValue();

            await new BranchExportImportCommandService(testContext).exportAll(MAIN_KEY);

            expect(pushSpy).toHaveBeenCalledTimes(2);
            const branches = pushSpy.mock.calls.map(call => call[1]).sort();
            expect(branches).toEqual(["feature-a", "main"]);
            expect(loggingTestTransport.logMessages.some(m => m.message.includes(`Exported Git mirror for ${MAIN_KEY}: 2 package(s) pushed`))).toBe(true);
        });

        it("skips the main package entry that listBranches reports alongside the real branches", async () => {
            // The real endpoint returns the main package as its own entry, keyed 'main' but
            // with no branch suffix on packageKey. Exporting it as a branch would request
            // '<mainKey>@main', which never exists.
            mockAxiosGet(branchesUrl(MAIN_KEY), [
                { packageKey: MAIN_KEY, branchKey: BranchUtils.MAIN_BRANCH_KEY, projectKey: MAIN_KEY, sourcePackageKey: MAIN_KEY, sourceVersion: null },
                { packageKey: BRANCH_KEY, branchKey: BRANCH, projectKey: MAIN_KEY, sourcePackageKey: MAIN_KEY, sourceVersion: "1.0.0" },
            ]);
            mockAxiosGet(exportUrl(MAIN_KEY), Buffer.from("zip"));
            mockAxiosGet(exportUrl(BRANCH_KEY), Buffer.from("zip"));
            jest.spyOn(FileService.prototype, "extractZipBufferToTempDirectory").mockImplementation(() => {
                const dir = makeTempDir();
                seedPackageDir(dir, MAIN_KEY);
                return dir;
            });
            const pushSpy = jest.spyOn(GitService.prototype, "pushToBranch").mockResolvedValue();

            await new BranchExportImportCommandService(testContext).exportAll(MAIN_KEY);

            expect(pushSpy).toHaveBeenCalledTimes(2);
            expect(pushSpy.mock.calls.map(call => call[1]).sort()).toEqual([BRANCH, BranchUtils.MAIN_BRANCH_KEY]);
            expect(loggingTestTransport.logMessages.some(m => m.message.includes(`Exported Git mirror for ${MAIN_KEY}: 2 package(s) pushed`))).toBe(true);
        });

        it("writes only the summary file and no per-branch logs when jsonResponse=true", async () => {
            mockAxiosGet(branchesUrl(MAIN_KEY), [
                { packageKey: BRANCH_KEY, branchKey: BRANCH, projectKey: MAIN_KEY, sourcePackageKey: MAIN_KEY, sourceVersion: "1.0.0" },
            ]);
            mockAxiosGet(exportUrl(MAIN_KEY), Buffer.from("zip"));
            mockAxiosGet(exportUrl(BRANCH_KEY), Buffer.from("zip"));
            jest.spyOn(FileService.prototype, "extractZipBufferToTempDirectory").mockImplementation(() => {
                const dir = makeTempDir();
                seedPackageDir(dir, MAIN_KEY);
                return dir;
            });
            jest.spyOn(GitService.prototype, "pushToBranch").mockResolvedValue();
            const writeSpy = jest.spyOn(fileService, "writeToFileWithGivenName").mockImplementation(() => undefined);

            await new BranchExportImportCommandService(testContext).exportAll(MAIN_KEY, true);

            expect(writeSpy).toHaveBeenCalledTimes(1);
            expect(JSON.parse(writeSpy.mock.calls[0][0] as string).synced).toEqual([MAIN_KEY, BRANCH_KEY]);
            expect(loggingTestTransport.logMessages.some(m => m.message.includes(`to Git branch '${BRANCH}'`))).toBe(false);
        });

        it("logs per-branch progress when jsonResponse is not set", async () => {
            mockAxiosGet(branchesUrl(MAIN_KEY), [
                { packageKey: BRANCH_KEY, branchKey: BRANCH, projectKey: MAIN_KEY, sourcePackageKey: MAIN_KEY, sourceVersion: "1.0.0" },
            ]);
            mockAxiosGet(exportUrl(MAIN_KEY), Buffer.from("zip"));
            mockAxiosGet(exportUrl(BRANCH_KEY), Buffer.from("zip"));
            jest.spyOn(FileService.prototype, "extractZipBufferToTempDirectory").mockImplementation(() => {
                const dir = makeTempDir();
                seedPackageDir(dir, MAIN_KEY);
                return dir;
            });
            jest.spyOn(GitService.prototype, "pushToBranch").mockResolvedValue();

            await new BranchExportImportCommandService(testContext).exportAll(MAIN_KEY);

            expect(loggingTestTransport.logMessages.some(m => m.message.includes(`Exported ${BRANCH_KEY} to Git branch '${BRANCH}'`))).toBe(true);
        });
    });

    describe("import from Git", () => {
        it("pulls the branch, restores the branch key, and imports", async () => {
            const remoteDir = makeTempDir();
            seedPackageDir(remoteDir, MAIN_KEY);
            jest.spyOn(GitService.prototype, "pullFromBranch").mockResolvedValue(remoteDir);
            mockAxiosPost(IMPORT_URL, { importedPackage: { key: BRANCH_KEY, name: "My Package" }, importedNodes: [] });

            let importedPkgKey: string | undefined;
            const realZip = fileService.zipDirectoryAsSinglePackage.bind(fileService);
            jest.spyOn(fileService, "zipDirectoryAsSinglePackage").mockImplementation((dir: string) => {
                importedPkgKey = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8")).key;
                return realZip(dir);
            });

            await new BranchExportImportCommandService(testContext).importBranch(MAIN_KEY, BRANCH, { gitEnabled: true });

            expect(GitService.prototype.pullFromBranch).toHaveBeenCalledWith(BRANCH);
            expect(importedPkgKey).toEqual(BRANCH_KEY);
            expect(mockedPostRequestBodyByUrl.get(IMPORT_URL)).toBeDefined();
            expect(loggingTestTransport.logMessages.some(m => m.message.includes(`Imported Git branch '${BRANCH}' into ${BRANCH_KEY}`))).toBe(true);
        });
    });

    describe("import locally", () => {
        it("imports from a directory, restoring the branch key, without touching Git", async () => {
            const localDir = makeTempDir();
            seedPackageDir(localDir, MAIN_KEY);
            const pullSpy = jest.spyOn(GitService.prototype, "pullFromBranch");
            mockAxiosPost(IMPORT_URL, { importedPackage: { key: BRANCH_KEY, name: "My Package" }, importedNodes: [] });

            let importedPkgKey: string | undefined;
            const realZip = fileService.zipDirectoryAsSinglePackage.bind(fileService);
            jest.spyOn(fileService, "zipDirectoryAsSinglePackage").mockImplementation((dir: string) => {
                importedPkgKey = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8")).key;
                return realZip(dir);
            });

            await new BranchExportImportCommandService(testContext).importBranch(MAIN_KEY, BRANCH, { directory: localDir });

            expect(pullSpy).not.toHaveBeenCalled();
            expect(importedPkgKey).toEqual(BRANCH_KEY);
            expect(mockedPostRequestBodyByUrl.get(IMPORT_URL)).toBeDefined();
            expect(loggingTestTransport.logMessages.some(m => m.message.includes(`into ${BRANCH_KEY}`))).toBe(true);
        });
    });
});
