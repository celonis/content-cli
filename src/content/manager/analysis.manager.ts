import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";

export class AnalysisManager extends BaseManager {
    private static BASE_URL = "/process-mining/api/analysis";
    private _id: string;
    private _processId: string;
    private _content: any;

    public get content(): any {
        return this._content;
    }

    public set content(value: any) {
        this._content = value;
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

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(
                /\/?$/,
                `${AnalysisManager.BASE_URL}/import?processId=${this.processId}`
            ),
            pullUrl: this.profile.team.replace(/\/?$/, `${AnalysisManager.BASE_URL}/export?id=${this.id}`),
            exportFileName: "analysis_" + this.id + ".json",
            onPushSuccessMessage: (data: any): string => {
                return "Analysis was pushed successfully. New ID: " + data.id;
            },
        };
    }

    public getBody(): any {
        return {
            formData: {
                file: this.content,
            },
        };
    }

    protected getSerializedFileContent(data: any): string {
        return JSON.stringify(data);
    }
}
