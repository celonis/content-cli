import {ManagerConfig} from "../../interfaces/manager-config.interface";
import {BaseManager} from "./base.manager";
import {logger} from "../../util/logger";
import {SaveSpace} from "../../interfaces/save-space.interface";

export class SpaceManager extends BaseManager {

    private static BASE_URL = "/package-manager/api/spaces";

    private _name: string;
    private _id: string;
    private _iconReference: string;

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
    }

    public get id(): string {
        return this._id;
    }

    public set id(value: string) {
        this._id = value;
    }

    public get iconReference(): string {
        return this._iconReference;
    }

    public set iconReference(value: string) {
        this._iconReference = value;
    }

    public getConfig(): ManagerConfig {
        return {
            findAllUrl: this.profile.team.replace(/\/?$/, SpaceManager.BASE_URL),
            onFindAll: (data: SaveSpace[]) => this.listSpaces(data),
        };
    }

    private listSpaces(nodes: SaveSpace[]): void {
        nodes.forEach(node => {
            logger.info(`${node.id} - Name: "${node.name}"`);
        });
    }

    protected getBody(): object {
        return {};
    }

    protected getSerializedFileContent(data: any): string {
        return "";
    }

}
