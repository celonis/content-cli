import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";
import { SaveContentNode } from "../../interfaces/save-content-node.interface";
import { parse, stringify } from "../../util/yaml";

export class AssetManager extends BaseManager {
    public static ASSET_FILE_PREFIX = "asset_";
    private static BASE_URL = "/package-manager/api/nodes";

    private static PUSH_URL = `${AssetManager.BASE_URL}/asset/import`;
    private static PULL_URL = `${AssetManager.BASE_URL}/asset/export`;

    private _key: string;
    private _content: string;
    private _packageKey: string;

    public get key(): string {
        return this._key;
    }

    public set key(value: string) {
        this._key = value;
    }

    public get content(): string {
        return this._content;
    }
    public set content(value: string) {
        this._content = value;
    }

    public get packageKey(): string {
        return this._packageKey;
    }

    public set packageKey(value: string) {
        this._packageKey = value;
    }

    private get onlyKey(): string {
        if (this.key) {
            return this.key.split(".")[1];
        }
    }

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(/\/?$/, AssetManager.PUSH_URL),
            pullUrl: this.profile.team.replace(/\/?$/, `${AssetManager.PULL_URL}/${this.key}`),
            exportFileName: `${AssetManager.ASSET_FILE_PREFIX}${this.onlyKey}.yml`,
            onPushSuccessMessage: (data: any): string => {
                return "Asset was pushed successfully. New key: " + data.rootWithKey;
            },
        };
    }

    public getBody(): any {
        return {
            body: JSON.stringify(this.toNodeTransport()),
        };
    }

    private toNodeTransport(): SaveContentNode {
        const asset = parse(this.content) as SaveContentNode;
        asset.rootNodeKey = this.packageKey;
        return asset;
    }

    protected getSerializedFileContent(data: any): string {
        return stringify(data);
    }
}
