import { ManagerConfig } from "../../interfaces/manager-config.interface";
import { BaseManager } from "./base.manager";
import * as YAML from "yaml";
import { AssetManager } from "./asset.manager";

YAML.scalarOptions.str.doubleQuoted.jsonEncoding = true;

export class WorkflowManager extends BaseManager {
    private static OLD_BASE_URL = "/process-automation/api/yaml/workflows";
    private static NEW_BASE_URL = "/process-automation/api/yaml/skills";
    private static PUSH_URL = `${WorkflowManager.OLD_BASE_URL}/import`;

    private static WORKFLOW_FILE_PREFIX = "workflow_";

    private _id: string;
    private _content: string;
    private _packageManager: boolean;

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

    public get packageManager(): boolean {
        return this._packageManager;
    }

    public set packageManager(value: boolean) {
        this._packageManager = value;
    }

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(/\/?$/, WorkflowManager.PUSH_URL),
            pullUrl: this.profile.team.replace(
                /\/?$/,
                `${this.packageManager ? WorkflowManager.NEW_BASE_URL : WorkflowManager.OLD_BASE_URL}/${this.id}/export`
            ),
            updateUrl: this.profile.team.replace(/\/?$/, WorkflowManager.PUSH_URL),
            exportFileName: `${
                this.packageManager ? AssetManager.ASSET_FILE_PREFIX : WorkflowManager.WORKFLOW_FILE_PREFIX
            }${this.id}.yaml`,
            onPushSuccessMessage: (data: any): string => {
                return `Workflow was pushed successfully. New Id: ${data.workflowId}`;
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
