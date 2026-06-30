import * as fs from "node:fs";
import * as FormData from "form-data";
import { Context } from "../../core/command/cli-context";
import { BaseManager } from "../../core/http/http-shared/base.manager";
import { ManagerConfig } from "../../core/http/http-shared/manager-config.interface";

export class ViewBookmarksManager extends BaseManager {
    private static readonly BASE_URL = "/blueprint/api/bookmarks";
    private static readonly VIEW_BOOKMARKS_FILE_PREFIX = "studio_view_bookmarks_";

    private _rootNodeKey: string;
    private _key: string;
    private _filePath: string;
    private _type: string;

    constructor(context: Context) {
        super(context);
    }

    public get filePath(): string {
        return this._filePath;
    }

    public set filePath(value: string) {
        this._filePath = value;
    }

    public get rootNodeKey(): string {
        return this._rootNodeKey;
    }

    public set rootNodeKey(value: string) {
        this._rootNodeKey = value;
    }

    public get key(): string {
        return this._key;
    }

    public set key(value: string) {
        this._key = value;
    }

    public get type(): string {
        return this._type;
    }

    public set type(value: string) {
        this._type = value;
    }

    public getConfig(): ManagerConfig {
        const keyParams = `rootNodeKey=${encodeURIComponent(this.rootNodeKey)}&key=${encodeURIComponent(this.key)}`;
        return {
            pushUrl: `${ViewBookmarksManager.BASE_URL}/import?${keyParams}`,
            pullUrl: `${ViewBookmarksManager.BASE_URL}/export?${keyParams}&type=${encodeURIComponent(this.type)}`,
            exportFileName: `${ViewBookmarksManager.VIEW_BOOKMARKS_FILE_PREFIX}${this.rootNodeKey}.${this.key}.json`,
            onPushSuccessMessage: (): string => {
                return "View Bookmarks were pushed successfully.";
            },
        };
    }

    public getBody(): any {
        const formData = new FormData();
        formData.append("file", fs.createReadStream(this.filePath));
        return formData;
    }

    protected getSerializedFileContent(data: any): string {
        return JSON.stringify(data);
    }
}
