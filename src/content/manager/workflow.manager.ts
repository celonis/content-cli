import { ManagerConfig } from "../../interfaces/manager-config.interface";
import { BaseManager } from "./base.manager";
import * as YAML from "yaml";
import { SaveContentNode } from "../../interfaces/save-content-node.interface";

export class WorkflowManager extends BaseManager {
    private static OLD_BASE_URL = "/process-automation/api/yaml/workflows";
    private static NEW_BASE_URL = "/process-automation/api/yaml/skills";
    private static PUSH_URL = `${WorkflowManager.OLD_BASE_URL}/import`;

    private static PACKAGE_MANAGER_BASE_URL = "/package-manager/api/nodes";
    private static PACKAGE_MANAGER_PUSH_URL = `${WorkflowManager.PACKAGE_MANAGER_BASE_URL}/asset/import`;

    private _id: string;
    private _content: string;
    private _packageManager: boolean;
    private _packageKey: string;

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

    public get packageKey(): string {
        return this._packageKey;
    }

    public set packageKey(value: string) {
        this._packageKey = value;
    }

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(
                /\/?$/,
                this.packageKey ? WorkflowManager.PACKAGE_MANAGER_PUSH_URL : WorkflowManager.PUSH_URL
            ),
            pullUrl: this.profile.team.replace(
                /\/?$/,
                `${this.packageManager ? WorkflowManager.NEW_BASE_URL : WorkflowManager.OLD_BASE_URL}/${this.id}/export`
            ),
            updateUrl: this.profile.team.replace(/\/?$/, WorkflowManager.PUSH_URL),
            exportFileName: "workflow_" + this.id + ".yaml",
            onPushSuccessMessage: (data: any): string => {
                const onPushMessage = this.packageKey ? `New Key: ${data.key}` : `New Id: ${data.workflowId}`;
                return `Workflow was pushed successfully. ${onPushMessage}`;
            },
            onUpdateSuccessMessage: (): string => {
                return "Workflow was updated successfully!";
            },
        };
    }

    public getBody(): any {
        const workflowPackage = {
            id: this.id,
            content: this.content,
        };
        return {
            body: JSON.stringify(this.packageKey ? this.toNodeTransport() : workflowPackage),
        };
    }

    protected getSerializedFileContent(data: any): string {
        YAML.scalarOptions.str.doubleQuoted.jsonEncoding = true;
        return YAML.stringify(data);
    }

    private toNodeTransport(): SaveContentNode {
        YAML.scalarOptions.str.doubleQuoted.jsonEncoding = true;
        const skill = YAML.parse(this.content) as SaveContentNode;
        skill.rootNodeKey = this.packageKey;
        return skill;
    }
}
