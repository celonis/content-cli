import * as fs from "node:fs";
import * as path from "path";
import * as os from "os";
import * as AdmZip from "adm-zip";
import { FileService } from "../../../src/core/utils/file-service";
import { FatalError, logger } from "../../../src/core/utils/logger";
import { rmTempDir } from "../../utls/fs-utils";

describe("FileService", () => {
    let fileService: FileService;
    const tempDir = path.join(os.tmpdir(), "file-service-test");
    const symLinkSourceTempDir = path.join(os.tmpdir(), "file-service-symlink-source");

    beforeAll(() => {
        rmTempDir(tempDir);
        rmTempDir(symLinkSourceTempDir);

        fs.mkdirSync(tempDir, { recursive: true, mode: 0o700 });
        fs.mkdirSync(symLinkSourceTempDir, { recursive: true, mode: 0o700 });

        fileService = new FileService();
    });

    afterAll(() => {
        rmTempDir(tempDir);
        rmTempDir(symLinkSourceTempDir);
    });

    describe("zipDirectoryInBatchExportFormat", () => {
        test("Should throw error if sourceDir is a symlink", () => {
            const targetDir = path.join(tempDir, "realDir");
            fs.mkdirSync(targetDir, 0o700);

            const symlinkDir = path.join(tempDir, "symlinkDir");
            fs.symlinkSync(targetDir, symlinkDir, "dir");

            expect(() => fileService.zipDirectoryInBatchExportFormat(symlinkDir)).toThrow(FatalError);
        });

        test("Should skip symlinked folder and only include real folder", () => {
            const realFolder = path.join(tempDir, "realFolder");
            fs.mkdirSync(realFolder, 0o700);
            fs.writeFileSync(path.join(realFolder, "insideFile.txt"), "content");

            const symLinkTargetFolder = path.join(symLinkSourceTempDir, "targetFolder");
            fs.mkdirSync(symLinkTargetFolder, 0o700);
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

    describe("zipDirectoryAsSinglePackage", () => {
        test("Should throw error if sourceDir is a symlink", () => {
            const targetDir = path.join(tempDir, "realPackageDir");
            fs.mkdirSync(targetDir, 0o700);

            const symlinkDir = path.join(tempDir, "symlinkPackageDir");
            fs.symlinkSync(targetDir, symlinkDir, "dir");

            expect(() => fileService.zipDirectoryAsSinglePackage(symlinkDir)).toThrow(FatalError);
        });

        test("Should create a flat zip preserving the single package structure", () => {
            fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({ key: "pkg-1" }));
            const nodesDir = path.join(tempDir, "nodes");
            fs.mkdirSync(nodesDir, 0o700);
            fs.writeFileSync(path.join(nodesDir, "node-1.json"), JSON.stringify({ key: "node-1" }));

            const zipPath = fileService.zipDirectoryAsSinglePackage(tempDir);
            const zip = new AdmZip(zipPath);
            const entries = zip.getEntries().map(e => e.entryName);

            expect(entries).toContain("package.json");
            expect(entries).toContain("nodes/node-1.json");
            expect(entries.some(name => name.endsWith(".zip"))).toBe(false);
        });
    });

    describe("writeBufferToFileWithGivenName", () => {
        test("Should write the raw buffer to disk byte-for-byte", () => {
            const targetFile = path.join(tempDir, "export.zip");
            const data = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01, 0x02]);

            fileService.writeBufferToFileWithGivenName(data, targetFile);

            expect(fs.existsSync(targetFile)).toBe(true);
            expect(fs.readFileSync(targetFile).equals(data)).toBe(true);
        });
    });

    describe("extractZipBufferToDirectory", () => {
        test("Should extract the package zip buffer into the target directory", () => {
            const zip = new AdmZip();
            zip.addFile("package.json", Buffer.from(JSON.stringify({ key: "pkg-1" })));
            zip.addFile("nodes/node-1.json", Buffer.from(JSON.stringify({ key: "node-1" })));
            const zipBuffer = zip.toBuffer();

            const targetDir = path.join(tempDir, "extracted");
            fileService.extractZipBufferToDirectory(zipBuffer, targetDir);

            expect(fs.existsSync(path.join(targetDir, "package.json"))).toBe(true);
            expect(fs.existsSync(path.join(targetDir, "nodes", "node-1.json"))).toBe(true);
            expect(JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"))).toEqual({ key: "pkg-1" });
        });
    });

    describe("extractZipBufferToTempDirectory", () => {
        test("Should extract the package zip buffer into a fresh temp directory and return its path", () => {
            const zip = new AdmZip();
            zip.addFile("package.json", Buffer.from(JSON.stringify({ key: "pkg-1" })));
            zip.addFile("nodes/node-1.json", Buffer.from(JSON.stringify({ key: "node-1" })));
            const zipBuffer = zip.toBuffer();

            const extractedDir = fileService.extractZipBufferToTempDirectory(zipBuffer);

            try {
                expect(extractedDir.startsWith(os.tmpdir())).toBe(true);
                expect(fs.existsSync(path.join(extractedDir, "package.json"))).toBe(true);
                expect(fs.existsSync(path.join(extractedDir, "nodes", "node-1.json"))).toBe(true);
                expect(JSON.parse(fs.readFileSync(path.join(extractedDir, "package.json"), "utf-8"))).toEqual({ key: "pkg-1" });
            } finally {
                rmTempDir(extractedDir);
            }
        });
    });
});
