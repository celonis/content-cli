import { ViewBookmarksManagerFactory } from "./view-bookmarks.manager-factory";
import { Context } from "../../core/command/cli-context";

export class ViewBookmarksCommandService {
    private viewBookmarksManagerFactory: ViewBookmarksManagerFactory;

    constructor(context: Context) {
        this.viewBookmarksManagerFactory = new ViewBookmarksManagerFactory(context);
    }

    public async pullViewBookmarks(boardId: string, type: string): Promise<void> {
        await this.viewBookmarksManagerFactory.createViewBookmarksManager(null, boardId, type).pull();
    }

    public async pushViewBookmarks(boardId: string, filename: string): Promise<void> {
        await this.viewBookmarksManagerFactory.createViewBookmarksManager(filename, boardId).push();
    }
}
