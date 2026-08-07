import { HttpClient } from "../../core/http/http-client";
import { Context } from "../../core/command/cli-context";
import { FatalError } from "../../core/utils/logger";
import { BookmarksExport, BookmarksImportRequest, BookmarksImportResult } from "./bookmarks.interfaces";

export class BookmarksApi {

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async exportBookmarks(packageKey: string): Promise<BookmarksExport> {
        return this.httpClient().get(`/package-manager/api/packages/${encodeURIComponent(packageKey)}/bookmarks/export`).catch(e => {
            throw new FatalError(`Problem exporting bookmarks for package ${packageKey}: ${e}`);
        });
    }

    public async importBookmarks(packageKey: string, payload: BookmarksImportRequest): Promise<BookmarksImportResult> {
        return this.httpClient().post(`/package-manager/api/packages/${encodeURIComponent(packageKey)}/bookmarks/import`, payload).catch(e => {
            throw new FatalError(`Problem importing bookmarks for package ${packageKey}: ${e}`);
        });
    }
}
