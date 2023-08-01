import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";

export class DataPoolManager extends BaseManager {
    public static DATA_POOL_FILE_NAME_PREFIX = "data-pool_";
    public static DATA_POOL_PUSH_REPORT_FILE_NAME_PREFIX = "push_report_";
    private static API_URL = "/integration/api";
    private static DATA_POOL_PUSH_URL = DataPoolManager.API_URL + "/pool-import";
    private static DATA_POOL_BATCH_IMPORT_URL = DataPoolManager.API_URL + "/batch-import";
    private static DATA_POOL_ACTIONS_URL = DataPoolManager.API_URL + "/pools/{id}";
    private static DATA_POOL_PULL_URL_V1 = DataPoolManager.DATA_POOL_ACTIONS_URL + "/export";
    private static DATA_POOL_PULL_URL_V2 = DataPoolManager.DATA_POOL_ACTIONS_URL + "/v2/export";

    private _id: string;
    private _content: string;
    private _batchImport: boolean;
    private _pullVersion: number;

    public get content(): string {
        return this._content;
    }

    public set content(value: string) {
        this._content = value;
    }

    public set pullVersion(value: number) {
        this._pullVersion = value;
    }

    public get batchImport(): boolean {
        return this._batchImport;
    }

    public set batchImport(value: boolean) {
        this._batchImport = value;
    }

    public get id(): string {
        return this._id;
    }

    public set id(value: string) {
        this._id = value;
    }

    public getConfig(): ManagerConfig {
        const pushReportFileName = DataPoolManager.DATA_POOL_PUSH_REPORT_FILE_NAME_PREFIX + Date.now() + ".json";
        return {
            pushUrl: this.profile.team.replace(/\/?$/, this.getPushURL()),
            pullUrl: this.profile.team.replace(/\/?$/, this.getPullURL()).replace("{id}", this.id),
            updateUrl: this.profile.team
                .replace(/\/?$/, DataPoolManager.DATA_POOL_ACTIONS_URL)
                .replace("{id}", this.id),
            exportFileName: DataPoolManager.DATA_POOL_FILE_NAME_PREFIX + this.id + ".json",
            pushReportFileName,
            onPushSuccessMessage: (data: any): string => {
                return "Data Pool was pushed successfully. New ID: " + data.id + ", Report file: " + pushReportFileName;
            },
            onUpdateSuccessMessage: (): string => {
                return "Data Pool was updated successfully!";
            },
        };
    }

    public getPushURL(): string {
        return this.batchImport ? DataPoolManager.DATA_POOL_BATCH_IMPORT_URL : DataPoolManager.DATA_POOL_PUSH_URL;
    }

    public getPullURL(): string {
        return this._pullVersion === 1 ? DataPoolManager.DATA_POOL_PULL_URL_V1 : DataPoolManager.DATA_POOL_PULL_URL_V2;
    }

    public getBody(): any {
        if (this.id != null) {
            const parsedContent = JSON.parse(this.content);
            return {
                body: JSON.stringify(parsedContent.dataPool),
            };
        }

        return {
            body: this.content,
        };
    }

    protected getSerializedFileContent(data: any): string {
        return JSON.stringify(data);
    }
}
