import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";
import * as fs from "fs";
import * as FormData from "form-data";

export class AnalysisBookmarksManager extends BaseManager {
    private static BASE_URL = "/process-analytics/api/bookmarks";
    private static ANALYSIS_BOOKMARKS_FILE_PREFIX = "studio_analysis_bookmarks_";

    private _analysisId: string;
    private _fileName: string;
    private _type: string;

    public get fileName(): string {
        return this._fileName;
    }

    public set fileName(value: string) {
        this._fileName = value;
    }

    public get analysisId(): string {
        return this._analysisId;
    }

    public set analysisId(value: string) {
        this._analysisId = value;
    }

    public get type(): string {
        return this._type;
    }

    public set type(value: string) {
        this._type = value;
    }

    public getConfig(): ManagerConfig {
        const pullUrl = `${AnalysisBookmarksManager.BASE_URL}/export?analysisId=${this.analysisId}&type=${this.type}`;
        return {
            pushUrl: this.profile.team.replace(
                /\/?$/,
                `${AnalysisBookmarksManager.BASE_URL}/import?analysisId=${this.analysisId}`
            ),
            pullUrl: this.profile.team.replace(/\/?$/, pullUrl),
            exportFileName: `${AnalysisBookmarksManager.ANALYSIS_BOOKMARKS_FILE_PREFIX}${this.analysisId}${".json"}`,
            onPushSuccessMessage: (): string => {
                return "Analysis Bookmarks was pushed successfully.";
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
