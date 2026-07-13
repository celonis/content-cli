import * as fs from "fs";
import * as path from "path";
import {FatalError, logger} from "./logger";
import AdmZip = require("adm-zip");
import { v4 as uuidv4 } from "uuid";
import * as os from "node:os";
import { FileConstants } from "./file.constants";

export class FileService {
    public static readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    public writeToFileWithGivenName(data: any, filename: string): void {
        fs.writeFileSync(path.resolve(process.cwd(), filename), this.getSerializedFileContent(data), {
            encoding: "utf-8",
            mode: FileConstants.DEFAULT_FILE_PERMISSIONS,
        });
    }

    public writeBufferToFileWithGivenName(data: Buffer, filename: string): void {
        fs.writeFileSync(path.resolve(process.cwd(), filename), data, {
            mode: FileConstants.DEFAULT_FILE_PERMISSIONS,
        });
    }

    public writeBufferToPath(targetDir: string, filename: string, data: Buffer): string {
        const resolvedDir = path.resolve(process.cwd(), targetDir);
        const absolutePath = path.join(resolvedDir, filename);
        this.mkdirRecursive(path.dirname(absolutePath));
        this.writeBufferToFileWithGivenName(data, absolutePath);
        return absolutePath;
    }

    public extractZipBufferToDirectory(data: Buffer, targetDir: string): void {
        const targetPath = path.resolve(process.cwd(), targetDir);
        this.mkdirRecursive(targetPath);
        new AdmZip(data).extractAllTo(targetPath, true, true);
        this.restrictFilePermissions(targetPath);
    }

    public extractZipBufferToTempDirectory(data: Buffer): string {
        const tempDir = path.join(os.tmpdir(), `content-cli-${uuidv4()}`);
        this.mkdirRecursive(tempDir);
        new AdmZip(data).extractAllTo(tempDir, true, true);
        this.restrictFilePermissions(tempDir);
        return tempDir;
    }

    public readFileToJson(fileName: string): any {
        const fileContent = this.readFile(fileName);

        return JSON.parse(fileContent);
    }

    public readFile(filename: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
            logger.error(new FatalError(`The provided file '${filename}' does not exit`));
        }
        return fs.readFileSync(path.resolve(process.cwd(), filename), {encoding: "utf-8"});
    }

    public extractExportedZipWithNestedZips(zipFile: AdmZip): string {
        const tempDir = path.join(os.tmpdir(), `${uuidv4()}`);

        return this.extractExportedZipWithNestedZipsToDir(zipFile, tempDir);
    }

    public extractExportedZipWithNestedZipsToDir(zipFile: AdmZip, targetDir: string): string {
        this.mkdirRecursive(targetDir);
        zipFile.extractAllTo(targetDir, true, true);

        const files = fs.readdirSync(targetDir);
        for (const file of files) {
            const innerZipPath = path.join(targetDir, file);
            if (file.endsWith(".zip")) {
                const nestedZip = new AdmZip(innerZipPath);
                const nestedDir = innerZipPath.replace(/\.zip$/, "");

                this.mkdirRecursive(nestedDir);
                nestedZip.extractAllTo(nestedDir, true, true);
                fs.rmSync(innerZipPath); // Optionally remove the inner zip
            }
        }
        this.restrictFilePermissions(targetDir);
        return targetDir;
    }

    public isDirectory(sourcePath: string): boolean {
        return fs.statSync(sourcePath)?.isDirectory()
    }

    public zipDirectoryInBatchExportFormat(sourceDir: string): string {
        if (fs.lstatSync(sourceDir).isSymbolicLink()) {
            throw new FatalError("Source directory cannot be a symbolic link.");
        }

        const files = fs.readdirSync(sourceDir);
        const finalZip = new AdmZip();

        files.forEach(file => {
            const fullPath = path.join(sourceDir, file);
            const stat = fs.lstatSync(fullPath);

            if (stat.isDirectory()) {
                const zip = new AdmZip();
                zip.addLocalFolder(fullPath);
                const zippedBuffer = zip.toBuffer();

                finalZip.addFile(`${file}.zip`, zippedBuffer, "", FileConstants.DEFAULT_FILE_PERMISSIONS);
            } else if (stat.isFile()) {
                finalZip.addLocalFile(fullPath);
            }
        });

        const tempDir = path.join(os.tmpdir(), "content-cli-exports");
        this.mkdirRecursive(tempDir);
        const zipFilePath = path.join(tempDir, `export_${uuidv4()}.zip`);
        finalZip.writeZip(zipFilePath, () => fs.chmodSync(zipFilePath, FileConstants.DEFAULT_FILE_PERMISSIONS));

        return zipFilePath;
    }

    public zipDirectoryAsSinglePackage(sourceDir: string): string {
        if (fs.lstatSync(sourceDir).isSymbolicLink()) {
            throw new FatalError("Source directory cannot be a symbolic link.");
        }

        const zip = new AdmZip();
        zip.addLocalFolder(sourceDir);

        const tempDir = path.join(os.tmpdir(), "content-cli-imports");
        this.mkdirRecursive(tempDir);
        const zipFilePath = path.join(tempDir, `single_package_${uuidv4()}.zip`);
        zip.writeZip(zipFilePath, () => fs.chmodSync(zipFilePath, FileConstants.DEFAULT_FILE_PERMISSIONS));

        return zipFilePath;
    }


    private getSerializedFileContent(data: any): string {
        return data;
    }

    private mkdirRecursive(dir: string): void {
        fs.mkdirSync(dir, { recursive: true, mode: FileConstants.DEFAULT_FOLDER_PERMISSIONS });
    }

    private restrictFilePermissions(targetDir: string): void {
        const files = fs.readdirSync(targetDir);
        for (const file of files) {
            const filePath = path.join(targetDir, file);
            if (fs.statSync(filePath)?.isDirectory()) {
                fs.chmodSync(filePath, FileConstants.DEFAULT_FOLDER_PERMISSIONS);
                this.restrictFilePermissions(filePath);
            } else {
                fs.chmodSync(filePath, FileConstants.DEFAULT_FILE_PERMISSIONS);
            }
        }
    }
}

export const fileService = new FileService();
