import { HttpClient } from "../../core/http/http-client";
import { Context } from "../../core/command/cli-context";
import { FatalError } from "../../core/utils/logger";

export class BookmarksApi {

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async exportBookmarks(packageKey: string): Promise<any> {
        return this.httpClient().get(`/package-manager/api/packages/${encodeURIComponent(packageKey)}/bookmarks/export`).catch(e => {
            throw new FatalError(`Problem exporting bookmarks for package ${packageKey}: ${e}`);
        });
    }

    public async importBookmarks(packageKey: string, payload: any): Promise<any> {
        return this.httpClient().post(`/package-manager/api/packages/${encodeURIComponent(packageKey)}/bookmarks/import`, payload).catch(e => {
            throw new FatalError(`Problem importing bookmarks for package ${packageKey}: ${e}`);
        });
    }
}
