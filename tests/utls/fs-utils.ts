import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loggingTestTransport } from "../jest.setup";
import { FileService } from "../../src/core/utils/file-service";
import { v4 as uuid } from "uuid";
import AdmZip = require("adm-zip");

export function getDownloadedFileName(): string {
    const filename = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
    return resolve(process.cwd(), filename);
}

export function getJsonFromDownloadedFile(): any {
    return getJsonFromFile(getDownloadedFileName());
}

export function getJsonFromFile(filename: string): any {
    const fullPath = resolve(process.cwd(), filename);
    const fileContents = readFileSync(fullPath, "utf8");
    return JSON.parse(fileContents);
}

export function writeJsonTempFile(filename: string, contents: any): void {
    writeTempFile(filename, JSON.stringify(contents));
}

export function writeTempFile(filename: string, contents: any): void {
    const fullPath = resolve(process.cwd(), filename);
    writeFileSync(fullPath, contents);
}
export function makeTempDir(): string {
    const folder = uuid();
    return makeTempDirWithName(folder);
}
export function makeTempDirWithName(folder: string): string {
    const fullPath = resolve(process.cwd(), folder);
    mkdirSync(fullPath);
    return fullPath;
}

export function zipToTempFolder(zip: AdmZip): string {
    const fullPath = resolve(process.cwd(), `${uuid()}.zip`);
    zip.writeZip(fullPath);
    return fullPath;
}