import { Context } from "../../core/command/cli-context";
import { BaseManager } from "../../core/http/http-shared/base.manager";
import { ManagerConfig } from "../../core/http/http-shared/manager-config.interface";

export abstract class CtpManager extends BaseManager {
  protected _content: any;
  protected _password: string;
  protected _spaceKey?: string;

  protected constructor(context: Context) {
    super(context);
  }

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

  public get spaceKey(): string {
    return this._spaceKey;
  }

  public set spaceKey(value: string) {
    this._spaceKey = value;
  }

  public getConfig(): ManagerConfig {
    return {
      pushUrl: this.getUrl(),
      onPushSuccessMessage: (): string => {
        return "CTP File was pushed successfully";
      },
    };
  }

  protected getSerializedFileContent(data: any): string {
    return JSON.stringify(data);
  }

  protected abstract getUrl(): string;
}
