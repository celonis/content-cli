import { ManagerConfig } from "../../interfaces/manager-config.interface";
import { BaseManager } from "./base.manager";
import * as fs from "fs";
import { logger } from "../../util/logger";
import { SaveContentNode } from "../../interfaces/save-content-node.interface";

export class PackageManager extends BaseManager {
    public static PACKAGE_FILE_PREFIX = "package_";
    public static PACKAGE_FILE_EXTENSION = ".zip";

    private static BASE_URL = "/package-manager/api/packages";

    private static IMPORT_ENDPOINT_PATH = "import";
    private static EXPORT_ENDPOINT_PATH = "export";

    private _key: string;
    private _spaceId: string;
    private _fileName: string;
    private _store: boolean;
    private _newKey: string;
    private _overwrite: boolean;

    public get key(): string {
        return this._key;
    }

    public set key(value: string) {
        this._key = value;
    }

    public get spaceId(): string {
        return this._spaceId;
    }

    public set spaceId(value: string) {
        this._spaceId = value;
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

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(/\/?$/, this.buildPushUrl()),
            pullUrl: this.profile.team.replace(
                /\/?$/,
                `${PackageManager.BASE_URL}/${this.key}/${PackageManager.EXPORT_ENDPOINT_PATH}?store=${this.store}${
                    this.newKey ? `&newKey=${this.newKey}` : ""
                }`
            ),
            findAllUrl: this.profile.team.replace(/\/?$/, PackageManager.BASE_URL),
            exportFileName:
                PackageManager.PACKAGE_FILE_PREFIX +
                (this.newKey ? this.newKey : this.key) +
                PackageManager.PACKAGE_FILE_EXTENSION,
            onPushSuccessMessage: (): string => "Package was pushed successfully.",
            onFindAll: (data: SaveContentNode[]) => this.listPackages(data),
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
                "You cannot overwrite a package and set a new key at the same time. Please use only one of the options."
            );
            process.exit();
        }
    }

    private getPushUrlWithParams(pushUrl: string): string {
        let pushUrlWithParams = pushUrl;
        if (this.spaceId || this.newKey || this.overwrite) {
            pushUrlWithParams = `${pushUrlWithParams}?`;
        }
        if (this.spaceId) {
            pushUrlWithParams = `${pushUrlWithParams}spaceId=${this.spaceId}&`;
        }
        if (this.newKey) {
            pushUrlWithParams = `${pushUrlWithParams}newKey=${this.newKey}&`;
        }
        if (this.overwrite) {
            pushUrlWithParams = `${pushUrlWithParams}overwrite=${this.overwrite}`;
        }
        return pushUrlWithParams;
    }
}
