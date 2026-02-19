import * as FormData from "form-data";
import {Context} from "../../../core/command/cli-context";
import {BaseManager} from "../../../core/http/http-shared/base.manager";
import {ManagerConfig} from "../../../core/http/http-shared/manager-config.interface";

export class SkillManager extends BaseManager {
    private static BASE_URL = "/action-engine/api/projects";
    private _skillId: string;
    private _projectId: string;
    private _content: any;

    constructor(context: Context) {
        super(context);
    }

    public get content(): any {
        return this._content;
    }

    public set content(value: any) {
        this._content = value;
    }
    public get skillId(): string {
        return this._skillId;
    }

    public set skillId(value: string) {
        this._skillId = value;
    }

    public get projectId(): string {
        return this._projectId;
    }

    public set projectId(value: string) {
        this._projectId = value;
    }

    public getConfig(): ManagerConfig {
        return {
            pushUrl: `${SkillManager.BASE_URL}/${this.projectId}/skills/import-file`,
            pullUrl: `${SkillManager.BASE_URL}/${this.projectId}/skills/${this.skillId}/export`,
            exportFileName: "skill_" + this.skillId + ".json",
            onPushSuccessMessage: (skill: any): string => {
                return "Skill was pushed successfully. New ID: " + skill.id;
            },
        };
    }

    public getBody(): any {
        const formData = new FormData();
        formData.append("file", this.content);
        return formData;
    }

    protected getSerializedFileContent(data: any): string {
        return JSON.stringify(data);
    }
}
