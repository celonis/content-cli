import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";

export class CTPManager extends BaseManager {
    private static BASE_URL = "/process-analytics/import/ctp";
    private _content: any;
    private _password: string;

    public get content(): any {
        return this._content;
    }

    public set content(value: any) {
        this._content = value;
    }

    public get password(): string {
        return this._password;
    }

    public set password(value: string) {
        this._password = value;
    }
    public getConfig(): ManagerConfig {
        const baseUrl = CTPManager.BASE_URL;
        return {
            pushUrl: this.profile.team.replace(/\/?$/, `${baseUrl}`),
            onPushSuccessMessage: (): string => {
                return "CTP File was pushed successfully";
            },
        };
    }

    public getBody(): any {
        return {
            formData: {
                file: this.content,
                password: this.password,
            },
        };
    }

    protected getSerializedFileContent(data: any): string {
        return JSON.stringify(data);
    }
}
