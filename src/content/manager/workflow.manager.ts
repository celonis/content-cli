import { ManagerConfig } from "../../interfaces/manager-config.interface";
import { BaseManager } from "./base.manager";
import * as YAML from "yaml";

export class WorkflowManager extends BaseManager {
    private static BASE_URL = "process-automation/api/workflow-models";
    private static PUSH_URL = `${WorkflowManager.BASE_URL}/export`;

    private _id: string;
    private _content: string;

    public get id(): string {
        return this._id;
    }

    public set id(value: string) {
        this._id = value;
    }

    public get content(): string {
        return this._content;
    }

    public set content(value: string) {
        this._content = value;
    }

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(/\/?$/, WorkflowManager.PUSH_URL),
            pullUrl: this.profile.team.replace(/\/?$/, `${WorkflowManager.BASE_URL}/${this.id}/import`),
            updateUrl: this.profile.team.replace(/\/?$/, WorkflowManager.PUSH_URL),
            exportFileName: "workflow_" + this.id + ".yaml",
            onPushSuccessMessage: (data: any): string => {
                return "Workflow was pushed successfully. New Id: " + data.workflowId;
            },
            onUpdateSuccessMessage: (): string => {
                return "Workflow was updated successfully!";
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
        return YAML.stringify(data);
    }
}
