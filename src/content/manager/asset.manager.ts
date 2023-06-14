import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";
import { SaveContentNode } from "../../interfaces/save-content-node.interface";
import * as YAML from "yaml";
import {logger} from "../../util/logger";
import { v4 as uuidv4 } from "uuid";

YAML.scalarOptions.str.doubleQuoted.jsonEncoding = true;

export class AssetManager extends BaseManager {
    public static ASSET_FILE_PREFIX = "asset_";
    private static BASE_URL = "/package-manager/api/nodes";

    private static PUSH_URL = `${AssetManager.BASE_URL}/asset/import`;
    private static PULL_URL = `${AssetManager.BASE_URL}/asset/export`;

    private _key: string;
    private _content: string;
    private _packageKey: string;
    private _assetType: string;
    private _ymlResponse: boolean;

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

    public get assetType(): string {
        return this._assetType;
    }

    public set assetType(value: string) {
        this._assetType = value;
    }

    public get ymlResponse(): boolean {
        return this._ymlResponse;
    }

    public set ymlResponse(value: boolean) {
        this._ymlResponse = value;
    }

    private get onlyKey(): string {
        if (this.key) {
            return this.key.split(".")[1];
        }
    }

    public getConfig(): ManagerConfig {
        return {
            findAllUrl: this.getFindAllUrl(),
            onFindAll: (data: SaveContentNode[]) => this.listAssets(data),
            pushUrl: this.profile.team.replace(/\/?$/, AssetManager.PUSH_URL),
            pullUrl: this.profile.team.replace(/\/?$/, `${AssetManager.PULL_URL}/${this.key}`),
            exportFileName: `${AssetManager.ASSET_FILE_PREFIX}${this.onlyKey}.yml`,
            onPushSuccessMessage: (data: any): string => {
                return "Asset was pushed successfully. New key: " + data.rootWithKey;
            },
        };
    }

    private listAssets(nodes: SaveContentNode[]): void {
        if (this.ymlResponse) {
            const nodesWithSpecificFields = nodes.map(node => {
                return {
                    key: node.key,
                    name: node.name,
                    assetType: node.assetType,
                    rootNodeKey: node.rootNodeKey,
                    activatedDraftId: node["activatedDraftId"]
                };
            });
            const filename = uuidv4() + ".yml";
            this.writeToFileWithGivenName(nodesWithSpecificFields, filename);
            logger.info(this.fileDownloadedMessage + filename);
        } else {
            nodes.forEach(node => {
                logger.info(`${node.key} - Name: "${node.name}" - Type: "${node.assetType}" -rootNodeKey: "${node.rootNodeKey}"`);
            });
        }
    }

    public getBody(): any {
        return {
            body: JSON.stringify(this.toNodeTransport()),
        };
    }

    private toNodeTransport(): SaveContentNode {
        const asset = YAML.parse(this.content) as SaveContentNode;
        asset.rootNodeKey = this.packageKey;
        return asset;
    }

    private getFindAllUrl(): string {
        const findAllUrl = this.profile.team.replace(/\/?$/, AssetManager.BASE_URL);
        if (this.assetType) {
            return `${findAllUrl}?assetType=${this.assetType}`;
        }
        return findAllUrl;
    }

    protected getSerializedFileContent(data: any): string {
        return YAML.stringify(data);
    }
}
