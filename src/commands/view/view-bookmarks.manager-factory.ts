import * as fs from "node:fs";
import * as path from "node:path";
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
        rootNodeKey: string,
        key: string,
        type?: string
    ): ViewBookmarksManager {
        const viewBookmarksManager = new ViewBookmarksManager(this.context);
        viewBookmarksManager.rootNodeKey = rootNodeKey;
        viewBookmarksManager.key = key;
        type = (type ?? "USER").toUpperCase();

        viewBookmarksManager.type = type;
        if (filename !== null) {
            viewBookmarksManager.filePath = this.resolveFilePath(filename);
        }
        return viewBookmarksManager;
    }

    private resolveFilePath(fileName: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), fileName))) {
            logger.error(new FatalError("The provided file does not exist"));
        }
        return path.resolve(process.cwd(), fileName);
    }
}
