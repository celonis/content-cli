import * as fs from "fs";
import * as path from "path";
import {logger} from "../util/logger";

export class FileService {

    public static readonly FILE_DOWNLOADED_MESSAGE = "File downloaded successfully. New filename: ";

    private static readonly EXPORTED_FILE_PREFIX = ".zip";


    public writeToFileWithGivenName(data: any, filename: string): void {
        fs.writeFileSync(path.resolve(process.cwd(), filename), this.getSerializedFileContent(data), {
            encoding: "utf-8",
        });
    }

    public writeStreamToFile(data: any, fileName: string, folderName ?: string): string {
        const exportedFilename = fileName + FileService.EXPORTED_FILE_PREFIX;
        const bundledPath  = folderName ? folderName + "/" + exportedFilename : exportedFilename;
        fs.writeFileSync(bundledPath, data);
        return exportedFilename;
    }

    public async createFolder(randomFolderName: string): Promise<void> {
        fs.mkdir(randomFolderName, () => {
            logger.info("Folder with name:  " + randomFolderName + " was created");
        })
    }

    private getSerializedFileContent(data: any): string {
        return data;
    }
}

export const fileService = new FileService();
