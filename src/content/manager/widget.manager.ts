import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";

export class WidgetManager extends BaseManager {
    private static BASE_URL = "/blueprint/api/widgets/upload";
    private static BASE_URL_TENANT_INDEPENDENT = "/blueprint/api/widgets/upload-tenant-independently";
    private _content: any;
    private _tenantIndependent = false;

    public get content(): any {
        return this._content;
    }

    public set content(value: any) {
        this._content = value;
    }

    public get tenantIndependent(): any {
        return this._tenantIndependent;
    }

    public set tenantIndependent(value: any) {
        this._tenantIndependent = value;
    }

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(
                /\/?$/,
                `${this.tenantIndependent ? WidgetManager.BASE_URL_TENANT_INDEPENDENT : WidgetManager.BASE_URL}`
            ),
            onPushSuccessMessage: (): string => {
                return "Widget was pushed successfully";
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
