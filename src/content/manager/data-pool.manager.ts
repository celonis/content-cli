import { BaseManager } from "./base.manager";
import { ManagerConfig } from "../../interfaces/manager-config.interface";
import {logger} from "../../util/logger";
import {DataPoolSlimTransport} from "../../interfaces/data-pool-manager.interfaces";

export class DataPoolManager extends BaseManager {
    public static DATA_POOL_FILE_NAME_PREFIX = "data-pool_";
    private static API_URL = "/integration/api";
    private static DATA_POOL_PUSH_URL = DataPoolManager.API_URL + "/pool-import";
    private static DATA_POOL_ACTIONS_URL = DataPoolManager.API_URL + "/pools/{id}";
    private static DATA_POOL_PULL_URL = DataPoolManager.DATA_POOL_ACTIONS_URL + "/export";
    private static DATA_POOLS_LIST_URL = DataPoolManager.API_URL + "/pools/paged";

    private _id: string;
    private _content: string;

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
            pushUrl: this.profile.team.replace(/\/?$/, `${DataPoolManager.DATA_POOL_PUSH_URL}`),
            findAllUrl: this.profile.team.replace(/\/?$/, `${DataPoolManager.DATA_POOLS_LIST_URL}`),
            pullUrl: this.profile.team
                .replace(/\/?$/, `${DataPoolManager.DATA_POOL_PULL_URL}`)
                .replace("{id}", this.id),
            updateUrl: this.profile.team
                .replace(/\/?$/, DataPoolManager.DATA_POOL_ACTIONS_URL)
                .replace("{id}", this.id),
            exportFileName: DataPoolManager.DATA_POOL_FILE_NAME_PREFIX + this.id + ".json",
            onPushSuccessMessage: (data: any): string => {
                return "Data Pool was pushed successfully. New ID: " + data.id;
            },
            onUpdateSuccessMessage: (): string => {
                return "Data Pool was updated successfully!";
            },
            onFindAll: (data: DataPoolSlimTransport[]) => this.listDataPools(data),
        };
    }

    public getBody(): any {
        if (this.id != null) {
            const parsedContent = JSON.parse(this.content);
            return {
                body: JSON.stringify(parsedContent.dataPool),
            };
        }

        return {
            body: this.content,
        };
    }


    private listDataPools(pools: DataPoolSlimTransport[]): void {
        pools.forEach(pool => {
            logger.info(`${pool}`);
        });
    }

    protected getSerializedFileContent(data: any): string {
        return JSON.stringify(data);
    }
}
