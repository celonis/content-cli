import { ManagerConfig } from "../../interfaces/manager-config.interface";
import { BaseManager } from "./base.manager";
import * as fs from "fs";

export class PackageManager extends BaseManager {
    public static PACKAGE_FILE_PREFIX = "package_";
    public static PACKAGE_FILE_EXTENSION = ".zip";

    private static BASE_URL = "/package-manager/api/packages";

    private static IMPORT_ENDPOINT_PATH = "import";
    private static EXPORT_ENDPOINT_PATH = "export";

    private _key: string;
    private _fileName: string;
    private _store: boolean;
    private _newKey: string;

    public get key(): string {
        return this._key;
    }

    public set key(value: string) {
        this._key = value;
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

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(
                /\/?$/,
                `${PackageManager.BASE_URL}/${PackageManager.IMPORT_ENDPOINT_PATH}${
                    this.newKey ? `?newKey=${this.newKey}` : ""
                }`
            ),
            pullUrl: this.profile.team.replace(
                /\/?$/,
                `${PackageManager.BASE_URL}/${this.key}/${PackageManager.EXPORT_ENDPOINT_PATH}?store=${this.store}${
                    this.newKey ? `&newKey=${this.newKey}` : ""
                }`
            ),
            exportFileName:
                PackageManager.PACKAGE_FILE_PREFIX +
                (this.newKey ? this.newKey : this.key) +
                PackageManager.PACKAGE_FILE_EXTENSION,
            onPushSuccessMessage: (): string => "Package was pushed successfully.",
        };
    }

    public getBody(): any {
        return {
            formData: {
                package: fs.createReadStream(this.fileName),
            },
        };
    }

    protected getSerializedFileContent(data: any): string {
        return data;
    }
}
