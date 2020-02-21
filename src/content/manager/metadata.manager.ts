import { BaseManager } from "./base.manager";

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

    // public getConfig(): IConfig {
    //
    //     return {
    //         pushUrl: `${MetadataManager.BASE_URL}/`,
    //         pullUrl: `${MetadataManager.BASE_URL}/${this.id}`,
    //
    //     }
    //
    // }

    public getPullUrl(): string {
        return this.profile.team.replace(/\/?$/, `${MetadataManager.BASE_URL}/${this.id}`);
    }

    public getPushUrl(): string {
        return this.profile.team.replace(/\/?$/, MetadataManager.BASE_URL);
    }

    public getBody(): any {
        return {
            body: JSON.stringify({
                id: this.id,
                content: this.content,
            }),
        };
    }

    public getUpdateUrl(): string {
        return this.profile.team.replace(/\/?$/, `${MetadataManager.BASE_URL}/${this.id}`);
    }

    protected getExportFileName(): string {
        return "metadata_" + this.id + ".yaml";
    }

    protected getSuccessPushMessage(data: any): string {
        return "Metadata was pushed successfully. New ID: " + data.id;
    }

    protected getSuccessUpdateMessage(): string {
        return "Metadata was updated successfully!";
    }

    protected getSerializedFileContent(data: any): string {
        return data.content;
    }
}
