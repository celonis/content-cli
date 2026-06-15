import { ViewBookmarksManagerFactory } from "./view-bookmarks.manager-factory";
import { Context } from "../../core/command/cli-context";
import { FatalError, logger } from "../../core/utils/logger";

const ALLOWED_VIEW_BOOKMARK_TYPES = ["USER", "SHARED", "ALL"];

export class ViewBookmarksCommandService {
    private readonly viewBookmarksManagerFactory: ViewBookmarksManagerFactory;

    constructor(context: Context) {
        this.viewBookmarksManagerFactory = new ViewBookmarksManagerFactory(context);
    }

    public async pullViewBookmarks(boardId: string, type?: string): Promise<void> {
        if (type !== undefined && !ALLOWED_VIEW_BOOKMARK_TYPES.includes(type.toUpperCase())) {
            logger.error(new FatalError(`Invalid type "${type}". Allowed values are: ${ALLOWED_VIEW_BOOKMARK_TYPES.join(", ")}.`));
        }
        await this.viewBookmarksManagerFactory.createViewBookmarksManager(null, boardId, type).pull();
    }

    public async pushViewBookmarks(boardId: string, filename: string): Promise<void> {
        await this.viewBookmarksManagerFactory.createViewBookmarksManager(filename, boardId).push();
    }
}
