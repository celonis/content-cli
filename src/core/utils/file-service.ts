import * as fs from "fs";
import * as path from "path";
import {FatalError, logger} from "./logger";
import AdmZip = require("adm-zip");
import { v4 as uuidv4 } from "uuid";
import * as os from "node:os";

export class FileService {
    public static readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    public writeToFileWithGivenName(data: any, filename: string): void {
        fs.writeFileSync(path.resolve(process.cwd(), filename), this.getSerializedFileContent(data), {
            encoding: "utf-8",
        });
    }

    public async readFileToJson<T>(fileName: string): Promise<T> {
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
        fs.mkdirSync(tempDir, { recursive: true });

        return this.extractExportedZipWithNestedZipsToDir(zipFile, tempDir);
    }

    public extractExportedZipWithNestedZipsToDir(zipFile: AdmZip, targetDir: string): string {
        zipFile.extractAllTo(targetDir, true);

        const files = fs.readdirSync(targetDir);
        for (const file of files) {
            const innerZipPath = path.join(targetDir, file);
            if (file.endsWith(".zip")) {
                const nestedZip = new AdmZip(innerZipPath);
                const nestedDir = innerZipPath.replace(/\.zip$/, "");

                fs.mkdirSync(nestedDir, { recursive: true });
                nestedZip.extractAllTo(nestedDir, true);
                fs.rmSync(innerZipPath); // Optionally remove the inner zip
            }
        }
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

                finalZip.addFile(`${file}.zip`, zippedBuffer);
            } else if (stat.isFile()) {
                finalZip.addLocalFile(fullPath);
            }
        });

        const tempDir = path.join(os.tmpdir(), "content-cli-exports");
        fs.mkdirSync(tempDir, { recursive: true });

        const zipFilePath = path.join(tempDir, `export_${uuidv4()}.zip`);
        finalZip.writeZip(zipFilePath);

        return zipFilePath;
    }


    private getSerializedFileContent(data: any): string {
        return data;
    }
}

export const fileService = new FileService();
