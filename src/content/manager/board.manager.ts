import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";
import * as YAML from "yaml";

export class BoardManager extends BaseManager {
    private static BASE_URL = "/blueprint/api/boards";
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
            pushUrl: this.profile.team.replace(/\/?$/, `${BoardManager.BASE_URL}`),
            pullUrl: this.profile.team.replace(/\/?$/, `${BoardManager.BASE_URL}/${this.id}`),
            updateUrl: this.profile.team.replace(/\/?$/, `${BoardManager.BASE_URL}/${this.id}`),
            exportFileName: "board_" + this.id + ".yaml",
            onPushSuccessMessage: (data: any): string => {
                return "Board was pushed successfully. New ID: " + data.id;
            },
            onUpdateSuccessMessage: (): string => {
                return "Board was updated successfully!";
            },
        };
    }

    public getBody(): any {
        return {
            body: JSON.stringify({
                id: this.id,
                configuration: this.content,
            }),
        };
    }

    protected getSerializedFileContent(data: any): string {
        return YAML.stringify(data.configuration);
    }
}
