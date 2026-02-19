jest.unmock("fs");

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as AdmZip from "adm-zip";
import {FileService} from "../../../src/core/utils/file-service";
import {FatalError} from "../../../src/core/utils/logger";

describe("FileService", () => {
    let fileService: FileService;
    const tempDir = path.join(os.tmpdir(), "file-service-test");
    const symLinkSourceTempDir = path.join(os.tmpdir(), "file-service-symlink-source");

    beforeEach(() => {
        fileService = new FileService();

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, {recursive: true});
        }

        if (!fs.existsSync(symLinkSourceTempDir)) {
            fs.mkdirSync(symLinkSourceTempDir, {recursive: true});
        }

        fileService = new FileService();
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, {recursive: true, force: true});
        }

        if (fs.existsSync(symLinkSourceTempDir)) {
            fs.rmSync(symLinkSourceTempDir, {recursive: true, force: true});
        }
    });

    describe("zipDirectoryInBatchExportFormat", () => {
        test("Should throw error if sourceDir is a symlink", () => {
            const targetDir = path.join(tempDir, "realDir");
            fs.mkdirSync(targetDir);

            const symlinkDir = path.join(tempDir, "symlinkDir");
            fs.symlinkSync(targetDir, symlinkDir, "dir");

            expect(() => fileService.zipDirectoryInBatchExportFormat(symlinkDir)).toThrow(FatalError);
        });

        test("Should skip symlinked folder and only include real folder", () => {
            const realFolder = path.join(tempDir, "realFolder");
            fs.mkdirSync(realFolder);
            fs.writeFileSync(path.join(realFolder, "insideFile.txt"), "content");

            const symLinkTargetFolder = path.join(symLinkSourceTempDir, "targetFolder");
            fs.mkdirSync(symLinkTargetFolder);
            const folderSymlink = path.join(tempDir, "folderSymlink");
            fs.symlinkSync(symLinkTargetFolder, folderSymlink, "dir");

            const zipPath = fileService.zipDirectoryInBatchExportFormat(tempDir);
            const zip = new AdmZip(zipPath);
            const entries = zip.getEntries().map(e => e.entryName);

            expect(entries).toContain("realFolder.zip");
            expect(entries).not.toContain("folderSymlink.zip");
        });

        test("Should skip symlinked file and only include real file", () => {
            const realFile = path.join(tempDir, "realFile.txt");
            fs.writeFileSync(realFile, "real content");

            const targetFile = path.join(symLinkSourceTempDir, "targetFile.txt");
            fs.writeFileSync(targetFile, "target content");
            const fileSymlink = path.join(tempDir, "fileSymlink.txt");
            fs.symlinkSync(targetFile, fileSymlink, "file");

            const zipPath = fileService.zipDirectoryInBatchExportFormat(tempDir);
            const zip = new AdmZip(zipPath);
            const entries = zip.getEntries().map(e => e.entryName);

            expect(entries).toContain("realFile.txt");
            expect(entries).not.toContain("fileSymlink.txt");
        });
    });
});
