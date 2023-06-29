import * as fs from "fs";
import * as path from "path";

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

    private getSerializedFileContent(data: any): string {
        return data;
    }

}

export const fileService = new FileService();
