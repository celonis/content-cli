import { ManagerConfig } from "../../interfaces/manager-config.interface";
import { BaseManager } from "./base.manager";
import * as fs from "fs";

export class PackageManager extends BaseManager {
    public static PACKAGE_FILE_PREFIX = "package_";
    public static PACKAGE_FILE_EXTENSION = ".zip";

    private static BASE_URL = "/package-manager/api/packages";

    private static IMPORT_ENDPOINT_PATH = "import";
    private static EXPORT_ENDPOINT_PATH = "export";

    private _id: string;
    private _fileName: string;

    public get id(): string {
        return this._id;
    }

    public set id(value: string) {
        this._id = value;
    }

    public get fileName(): string {
        return this._fileName;
    }

    public set fileName(value: string) {
        this._fileName = value;
    }

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(
                /\/?$/,
                `${PackageManager.BASE_URL}/${PackageManager.IMPORT_ENDPOINT_PATH}`
            ),
            pullUrl: this.profile.team.replace(
                /\/?$/,
                `${PackageManager.BASE_URL}/${this._id}/${PackageManager.EXPORT_ENDPOINT_PATH}`
            ),
            updateUrl: undefined,
            exportFileName: PackageManager.PACKAGE_FILE_PREFIX + this.id + PackageManager.PACKAGE_FILE_EXTENSION,
            onPushSuccessMessage: (): string => "Package was pushed successfully.",
            onUpdateSuccessMessage: (): string => undefined,
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
