import * as fs from "fs";
import * as path from "path";
import { ManifestNodeTransport } from "../interfaces/manifest-transport";
import { FatalError, logger } from "../util/logger";
import {parse} from "../util/yaml";

export class FileService {
    public static readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    public writeToFileWithGivenName(data: any, filename: string): void {
        fs.writeFileSync(path.resolve(process.cwd(), filename), this.getSerializedFileContent(data), {
            encoding: "utf-8",
        });
    }

    public createDirectoryWithGivenName(dirName: string): void {
        fs.mkdirSync(path.resolve(process.cwd(), dirName));
    }

    public readManifestFile(importedFileName: string): Promise<ManifestNodeTransport[]> {
        const manifest: ManifestNodeTransport[] = parse(
            fs.readFileSync(path.resolve(importedFileName + "/manifest.yml"), { encoding: "utf-8" })
        );
        return Promise.all(manifest);
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

    private getSerializedFileContent(data: any): string {
        return data;
    }
}

export const fileService = new FileService();
