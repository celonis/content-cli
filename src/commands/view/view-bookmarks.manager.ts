import * as fs from "fs";
import * as FormData from "form-data";
import { Context } from "../../core/command/cli-context";
import { BaseManager } from "../../core/http/http-shared/base.manager";
import { ManagerConfig } from "../../core/http/http-shared/manager-config.interface";

export class ViewBookmarksManager extends BaseManager {
    private static BASE_URL = "/blueprint/api/bookmarks";
    private static VIEW_BOOKMARKS_FILE_PREFIX = "studio_view_bookmarks_";

    private _boardId: string;
    private _fileName: string;
    private _type: string;

    constructor(context: Context) {
        super(context);
    }

    public get fileName(): string {
        return this._fileName;
    }

    public set fileName(value: string) {
        this._fileName = value;
    }

    public get boardId(): string {
        return this._boardId;
    }

    public set boardId(value: string) {
        this._boardId = value;
    }

    public get type(): string {
        return this._type;
    }

    public set type(value: string) {
        this._type = value;
    }

    public getConfig(): ManagerConfig {
        return {
            pushUrl: `${ViewBookmarksManager.BASE_URL}/import?boardId=${encodeURIComponent(this.boardId)}`,
            pullUrl: `${ViewBookmarksManager.BASE_URL}/export?boardId=${encodeURIComponent(this.boardId)}&type=${encodeURIComponent(this.type)}`,
            exportFileName: `${ViewBookmarksManager.VIEW_BOOKMARKS_FILE_PREFIX}${this.boardId}.json`,
            onPushSuccessMessage: (): string => {
                return "View Bookmarks were pushed successfully.";
            },
        };
    }

    public getBody(): any {
        const formData = new FormData();
        formData.append("file", fs.createReadStream(this.fileName));
        return formData;
    }

    protected getSerializedFileContent(data: any): string {
        return JSON.stringify(data);
    }
}
