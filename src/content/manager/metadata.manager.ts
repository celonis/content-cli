import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";

export class MetadataManager extends BaseManager {
    private static BASE_URL = "/semantic-layer/api/yaml-metadata";
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
            pushUrl: this.profile.team.replace(/\/?$/, `${MetadataManager.BASE_URL}/`),
            pullUrl: this.profile.team.replace(/\/?$/, `${MetadataManager.BASE_URL}/${this.id}`),
            updateUrl: this.profile.team.replace(/\/?$/, `${MetadataManager.BASE_URL}/${this.id}`),
            exportFileName: "metadata_" + this.id + ".yaml",
            onPushSuccessMessage: (data: any): string => {
                return "Metadata was pushed successfully. New ID: " + data.id;
            },
            onUpdateSuccessMessage: (): string => {
                return "Metadata was updated successfully!";
            },
        };
    }

    public getBody(): any {
        return {
            body: JSON.stringify({
                id: this.id,
                content: this.content,
            }),
        };
    }

    protected getSerializedFileContent(data: any): string {
        return data.content;
    }
}
