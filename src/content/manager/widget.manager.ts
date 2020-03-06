import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";

export class WidgetManager extends BaseManager {
    private static BASE_URL = "/blueprint/api/widgets/upload";
    private _content: any;

    public get content(): any {
        return this._content;
    }

    public set content(value: any) {
        this._content = value;
    }

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(/\/?$/, `${WidgetManager.BASE_URL}`),
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
