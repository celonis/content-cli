import * as fs from "fs";
import * as FormData from "form-data";
import { BaseManager } from "../../../core/http/http-shared/base.manager";
import { ManagerConfig } from "../../../core/http/http-shared/manager-config.interface";
import { SaveContentNode } from "../interfaces/save-content-node.interface";
import { logger } from "../../../core/utils/logger";
import { Context } from "../../../core/command/cli-context";

export class PackageManager extends BaseManager {
  public static PACKAGE_FILE_PREFIX = "package_";
  public static PACKAGE_FILE_EXTENSION = ".zip";

  private static BASE_URL = "/package-manager/api/packages";

  private static IMPORT_ENDPOINT_PATH = "import";
  private static EXPORT_ENDPOINT_PATH = "export";

  private _key: string;
  private _spaceKey: string;
  private _fileName: string;
  private _store: boolean;
  private _newKey: string;
  private _overwrite: boolean;
  private _draft: boolean;

  constructor(context: Context) {
    super(context);
  }

  public get key(): string {
    return this._key;
  }

  public set key(value: string) {
    this._key = value;
  }

  public get spaceKey(): string {
    return this._spaceKey;
  }

  public set spaceKey(value: string) {
    this._spaceKey = value;
  }

  public get fileName(): string {
    return this._fileName;
  }

  public set fileName(value: string) {
    this._fileName = value;
  }

  public get store(): boolean {
    return this._store;
  }

  public set store(value: boolean) {
    this._store = value;
  }

  public get newKey(): string {
    return this._newKey;
  }

  public set newKey(value: string) {
    this._newKey = value;
  }

  public get overwrite(): boolean {
    return this._overwrite;
  }

  public set overwrite(value: boolean) {
    this._overwrite = value;
  }

  public get draft(): boolean {
    return this._draft;
  }

  public set draft(value: boolean) {
    this._draft = value;
  }

  public getConfig(): ManagerConfig {
    return {
      pushUrl: this.buildPushUrl(),
      pullUrl: `${PackageManager.BASE_URL}/${this.key}/${PackageManager.EXPORT_ENDPOINT_PATH}?store=${
        this.store
      }&draft=${this.draft}${this.newKey ? `&newKey=${this.newKey}` : ""}`,
      findAllUrl: PackageManager.BASE_URL,
      exportFileName:
        PackageManager.PACKAGE_FILE_PREFIX +
        (this.newKey ? this.newKey : this.key) +
        PackageManager.PACKAGE_FILE_EXTENSION,
      onPushSuccessMessage: (): string => "Package was pushed successfully.",
      onFindAll: (data: SaveContentNode[]) => this.listPackages(data),
    };
  }

  public getBody(): any {
    const formData = new FormData();
    formData.append("package", fs.createReadStream(this.fileName));
    return formData;
  }

  protected getSerializedFileContent(data: any): string {
    return data;
  }

  private buildPushUrl(): string {
    this.validateOptions();
    const pushUrl = `${PackageManager.BASE_URL}/${PackageManager.IMPORT_ENDPOINT_PATH}`;
    return this.getPushUrlWithParams(pushUrl);
  }

  private listPackages(nodes: SaveContentNode[]): void {
    nodes.forEach(node => {
      logger.info(`${node.name} - Key: "${node.key}"`);
    });
  }

  private validateOptions(): void {
    if (this.newKey && this.overwrite) {
      logger.error(
        "You cannot overwrite a package and set a new key at the same time. Please use only one of the options.",
      );
      process.exit();
    }
  }

  private getPushUrlWithParams(pushUrl: string): string {
    const pushUrlWithParams = `${pushUrl}?spaceId=${this.spaceKey}&`;
    if (this.newKey) {
      return `${pushUrlWithParams}newKey=${this.newKey}`;
    }
    if (this.overwrite) {
      return `${pushUrlWithParams}overwrite=${this.overwrite}`;
    }
    return pushUrlWithParams;
  }
}
