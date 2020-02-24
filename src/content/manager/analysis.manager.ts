import { BaseManager } from "./base.manager";
import { ManagerConfig } from "./interfaces/manager-config.interface";

export class AnalysisManager extends BaseManager {
    private static BASE_URL = "/process-mining/api/analysis";
    private _id: string;
    private _content: string;

    public get content(): string {
        return this._content;
    }

    public set content(value: string) {
        this._content = value;
    }

    public get id(): string {
        return this._id;
    }

    public set id(value: string) {
        this._id = value;
    }

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(/\/?$/, `${AnalysisManager.BASE_URL}/`),
            pullUrl: this.profile.team.replace(/\/?$/, `${AnalysisManager.BASE_URL}/${this.id}`),
            exportFileName: "analysis_" + this.id + ".json",
            onPushSuccessMessage: (data: any): string => {
                return "Analysis was pushed successfully. New ID: " + data.analysis.id;
            },
            onUpdateSuccessMessage: (): string => {
                return "Analysis was updated successfully!";
            },
        };
    }

    public getBody(): any {
        return {
            body: JSON.stringify(this.content),
        };
    }

    protected getSerializedFileContent(data: any): string {
        return JSON.stringify(data);
    }
}
