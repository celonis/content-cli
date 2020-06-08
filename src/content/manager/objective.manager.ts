import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";

export class ObjectiveManager extends BaseManager {
    private static BASE_URL = "/transformation-center/api";
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
            pushUrl: this.profile.team.replace(/\/?$/, `${ObjectiveManager.BASE_URL}/objective-kpis/import`),
            pullUrl: this.profile.team.replace(/\/?$/, `${ObjectiveManager.BASE_URL}/objectives/export?id=${this.id}`),
            exportFileName: "objective_" + this.id + ".json",
            onPushSuccessMessage: (data: any): string => {
                return "Objective was pushed successfully. New ID: " + data.analysis.id;
            },
        };
    }

    public getBody(): any {
        return {
            body: JSON.stringify({
                useDataModelId: "dummy",
                serializedObjectiveExports: this.content,
            }),
        };
    }

    protected getSerializedFileContent(data: any): string {
        return JSON.stringify(data);
    }
}
