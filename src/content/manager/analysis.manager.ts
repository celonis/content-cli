import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";
import * as YAML from "yaml";
import { AssetManager } from "./asset.manager";
import * as fs from "fs";

YAML.scalarOptions.str.doubleQuoted.jsonEncoding = true;

export class AnalysisManager extends BaseManager {
    private static BASE_URL = "/process-mining/api/analysis/";
    private static PULL_URL = `${AnalysisManager.BASE_URL}/export?id=`;
    private static ANALYSIS_FILE_PREFIX = "analysis_";

    private _id: string;
    private _processId: string;
    private _fileName: string;
    private _packageManager: boolean;

    public get fileName(): string {
        return this._fileName;
    }

    public set fileName(value: string) {
        this._fileName = value;
    }

    public get id(): string {
        return this._id;
    }

    public set id(value: string) {
        this._id = value;
    }

    public get processId(): string {
        return this._processId;
    }

    public set processId(value: string) {
        this._processId = value;
    }

    public get packageManager(): boolean {
        return this._packageManager;
    }

    public set packageManager(value: boolean) {
        this._packageManager = value;
    }

    public getConfig(): ManagerConfig {
        const pullUrl = this.packageManager
            ? `${AnalysisManager.BASE_URL}${this.id}/package/export`
            : `${AnalysisManager.PULL_URL}${this.id}`;
        return {
            pushUrl: this.profile.team.replace(
                /\/?$/,
                `${AnalysisManager.BASE_URL}/import?processId=${this.processId}`
            ),
            pullUrl: this.profile.team.replace(/\/?$/, pullUrl),
            exportFileName: `${
                this.packageManager ? AssetManager.ASSET_FILE_PREFIX : AnalysisManager.ANALYSIS_FILE_PREFIX
            }${this.id}${this.packageManager ? ".yaml" : ".json"}`,
            onPushSuccessMessage: (data: any): string => {
                return "Analysis was pushed successfully. New ID: " + data.id;
            },
        };
    }

    public getBody(): any {
        return {
            formData: {
                file: fs.createReadStream(this.fileName),
            },
        };
    }

    protected getSerializedFileContent(data: any): string {
        if (this.packageManager) {
            return YAML.stringify(data);
        }
        return JSON.stringify(data);
    }
}
