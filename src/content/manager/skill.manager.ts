import { BaseManager } from "./base.manager";

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

    public getPullUrl(): string {
        return this.profile.team.replace(
            /\/?$/,
            `${SkillManager.BASE_URL}/${this.projectId}/skills/${this.skillId}/export`
        );
    }

    public getPushUrl(): string {
        return this.profile.team.replace(/\/?$/, `${SkillManager.BASE_URL}/${this.projectId}/skills/import-file`);
    }

    public getBody(): any {
        return {
            formData: {
                file: this.content,
            },
        };
    }

    public getUpdateUrl(): string {
        return null;
    }

    protected getExportFileName(): string {
        return "skill_" + this.skillId + ".json";
    }

    protected getSuccessPushMessage(skill: any): string {
        return "Skill was pushed successfully. New ID: " + skill.id;
    }

    protected getSuccessUpdateMessage(): string {
        return null;
    }

    protected getSerializedFileContent(data: any): string {
        return JSON.stringify(data);
    }
}
