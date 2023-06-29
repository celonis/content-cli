import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import {ManifestNodeTransport} from "../interfaces/manifest-transport";

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
        const manifest: ManifestNodeTransport[] = YAML.parse(fs.readFileSync(path.resolve(importedFileName + "/manifest.yml"), { encoding: "utf-8" }));
        return Promise.all(manifest);
    }
    private getSerializedFileContent(data: any): string {
        return data;
    }

}

export const fileService = new FileService();
