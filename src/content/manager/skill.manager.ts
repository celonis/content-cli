import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";

export class SkillManager extends BaseManager {
    private static BASE_URL = "/action-engine/api/projects/";
    private _skillId: string;
    private _projectId: string;
    private _content: any;

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
            pushUrl: this.profile.team.replace(/\/?$/, `${SkillManager.BASE_URL}/${this.projectId}/skills/import-file`),
            pullUrl: this.profile.team.replace(
                /\/?$/,
                `${SkillManager.BASE_URL}/${this.projectId}/skills/${this.skillId}/export`
            ),
            exportFileName: "skill_" + this.skillId + ".json",
            onPushSuccessMessage: (skill: any): string => {
                return "Skill was pushed successfully. New ID: " + skill.id;
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
        return data;
    }
}
