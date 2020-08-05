import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";

export class WidgetManager extends BaseManager {
    private static PACKAGE_MANAGER_BASE_URL = "/package-manager";
    private static BLUEPRINT_BASE_URL = "/blueprint";
    private static WIDGET_API = "/api/widgets/upload";
    private static WIDGET_TENANT_INDEPENDENT_API = "/api/widgets/upload-tenant-independently";
    private _content: any;
    private _tenantIndependent = false;
    private _packageManager = false;

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

    public get packageManager(): any {
        return this._packageManager;
    }

    public set packageManager(value: any) {
        this._packageManager = value;
    }

    public getConfig(): ManagerConfig {
        const baseUrl = this.packageManager ? WidgetManager.PACKAGE_MANAGER_BASE_URL : WidgetManager.BLUEPRINT_BASE_URL;
        const widgetUrl = this.tenantIndependent
            ? WidgetManager.WIDGET_TENANT_INDEPENDENT_API
            : WidgetManager.WIDGET_API;
        return {
            pushUrl: this.profile.team.replace(/\/?$/, `${baseUrl}${widgetUrl}`),
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
