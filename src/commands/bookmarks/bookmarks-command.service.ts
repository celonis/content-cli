import { Context } from "../../core/command/cli-context";
import { BookmarksApi } from "./bookmarks-api";
import { fileService, FileService } from "../../core/utils/file-service";
import { CuiFileService } from "../../core/utils/cui-file-service";
import { logger } from "../../core/utils/logger";

export class BookmarksCommandService {

    private readonly bookmarksApi: BookmarksApi;
    private readonly cuiFileService: CuiFileService;

    constructor(context: Context) {
        this.bookmarksApi = new BookmarksApi(context);
        this.cuiFileService = new CuiFileService(context);
    }

    public async exportBookmarks(packageKey: string, file?: string): Promise<void> {
        const exportData = await this.bookmarksApi.exportBookmarks(packageKey);

        const fileName = file ?? `bookmarks-${packageKey}.json`;
        const writtenFilename = await this.cuiFileService.writeToFileWithGivenName(JSON.stringify(exportData, null, 4), fileName);
        logger.info(FileService.fileDownloadedMessage + writtenFilename);
    }

    public async importBookmarks(packageKey: string, file: string): Promise<void> {
        const payload = fileService.readFileToJson(file);
        const result = await this.bookmarksApi.importBookmarks(packageKey, payload);
        logger.info(`Bookmarks imported successfully: ${JSON.stringify(result, null, 4)}`);
    }
}
