import * as fs from "fs";
import * as path from "path";
import { ViewBookmarksManager } from "./view-bookmarks.manager";
import { FatalError, logger } from "../../core/utils/logger";
import { Context } from "../../core/command/cli-context";

export class ViewBookmarksManagerFactory {

    private readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    public createViewBookmarksManager(
        filename: string,
        boardId: string,
        type?: string
    ): ViewBookmarksManager {
        const viewBookmarksManager = new ViewBookmarksManager(this.context);
        viewBookmarksManager.boardId = boardId;
        type = (type ?? "USER").toUpperCase();

        viewBookmarksManager.type = type;
        if (filename !== null) {
            viewBookmarksManager.fileName = this.readFile(filename);
        }
        return viewBookmarksManager;
    }

    private readFile(fileName: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), fileName))) {
            logger.error(new FatalError("The provided file does not exist"));
        }
        return path.resolve(process.cwd(), fileName);
    }
}
