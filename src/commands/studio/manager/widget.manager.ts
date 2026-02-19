import * as FormData from "form-data";
import {BaseManager} from "../../../core/http/http-shared/base.manager";
import {Context} from "../../../core/command/cli-context";
import {ManagerConfig} from "../../../core/http/http-shared/manager-config.interface";

export class WidgetManager extends BaseManager {
    private static PACKAGE_MANAGER_BASE_URL = "/package-manager";
    private static WIDGET_API = "/api/widgets/upload";
    private static WIDGET_TENANT_INDEPENDENT_API = "/api/widgets/upload-tenant-independently";
    private static WIDGET_USER_SPECIFIC_API = "/api/widgets/upload-user";
    private _content: any;
    private _tenantIndependent = false;
    private _userSpecific = false;

    constructor(context: Context) {
        super(context);
    }

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

    public get userSpecific(): any {
        return this._userSpecific;
    }

    public set userSpecific(value: any) {
        this._userSpecific = value;
    }

    public getConfig(): ManagerConfig {
        const baseUrl = WidgetManager.PACKAGE_MANAGER_BASE_URL;
        const widgetUrl = this.userSpecific
            ? WidgetManager.WIDGET_USER_SPECIFIC_API
            : this.tenantIndependent
              ? WidgetManager.WIDGET_TENANT_INDEPENDENT_API
              : WidgetManager.WIDGET_API;
        return {
            pushUrl: `${baseUrl}${widgetUrl}`,
            onPushSuccessMessage: (): string => {
                return "Widget was pushed successfully";
            },
        };
    }

    public getBody(): any {
        const formData = new FormData();
        formData.append("file", this.content);
        return formData;
    }

    protected getSerializedFileContent(data: any): string {
        return data;
    }
}
