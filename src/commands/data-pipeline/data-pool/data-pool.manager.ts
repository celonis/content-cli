import { BaseManager } from "../../../core/http/http-shared/base.manager";
import { ManagerConfig } from "../../../core/http/http-shared/manager-config.interface";
import { Context } from "../../../core/command/cli-context";

export class DataPoolManager extends BaseManager {
  public static DATA_POOL_FILE_NAME_PREFIX = "data-pool_";
  private static API_URL = "/integration/api";
  private static DATA_POOL_PUSH_URL = DataPoolManager.API_URL + "/pool-import";
  private static DATA_POOL_ACTIONS_URL =
    DataPoolManager.API_URL + "/pools/{id}";
  private static DATA_POOL_PULL_URL =
    DataPoolManager.DATA_POOL_ACTIONS_URL + "/export";

  private _id: string;
  private _content: string;

  constructor(context: Context) {
    super(context);
  }

  public get content(): string {
    return this._content;
  }

  public set content(value: string) {
    this._content = value;
  }

  public get id(): string {
    return this._id;
  }

  public set id(value: string) {
    this._id = value;
  }

  public getConfig(): ManagerConfig {
    return {
      pushUrl: DataPoolManager.DATA_POOL_PUSH_URL,
      pullUrl: DataPoolManager.DATA_POOL_PULL_URL.replace("{id}", this.id),
      updateUrl: DataPoolManager.DATA_POOL_ACTIONS_URL.replace("{id}", this.id),
      exportFileName:
        DataPoolManager.DATA_POOL_FILE_NAME_PREFIX + this.id + ".json",
      onPushSuccessMessage: (data: any): string => {
        return "Data Pool was pushed successfully. New ID: " + data.id;
      },
      onUpdateSuccessMessage: (): string => {
        return "Data Pool was updated successfully!";
      },
    };
  }

  public getBody(): any {
    if (this.id != null) {
      const parsedContent = JSON.parse(this.content);
      return parsedContent.dataPool;
    }

    return this.content;
  }

  protected getSerializedFileContent(data: any): string {
    return JSON.stringify(data);
  }
}
