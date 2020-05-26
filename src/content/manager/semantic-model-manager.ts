import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";

export class SemanticModelManager extends BaseManager {
    public static SEMANTIC_MODEL_FILE_PREFIX = "semantic-model_";
    private static BASE_URL = "/semantic-layer/api/yaml-metadata";
    private static MODEL_BASE_URL = "/semantic-layer/api/layer";
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
            pushUrl: this.profile.team.replace(/\/?$/, `${SemanticModelManager.BASE_URL}`),
            pullUrl: this.profile.team.replace(/\/?$/, `${SemanticModelManager.MODEL_BASE_URL}/${this.id}`),
            updateUrl: this.profile.team.replace(/\/?$/, `${SemanticModelManager.BASE_URL}/${this.id}`),
            exportFileName: SemanticModelManager.SEMANTIC_MODEL_FILE_PREFIX + this.id + ".yml",
            onPushSuccessMessage: (data: any): string => {
                return "Semantic Model was pushed successfully. New ID: " + data.metadataId;
            },
            onUpdateSuccessMessage: (): string => {
                return "Semantic Model was updated successfully!";
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
        return JSON.stringify(data);
    }
}
