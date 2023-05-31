import {ManagerConfig} from "../../interfaces/manager-config.interface";
import {BaseManager} from "./base.manager";
import {logger} from "../../util/logger";
import {SaveSpace} from "../../interfaces/save-space.interface";
import {v4 as uuidv4} from "uuid";

export class SpaceManager extends BaseManager {

    private static BASE_URL = "/package-manager/api/spaces";

    private _jsonResponse: boolean;

    public get jsonResponse(): boolean {
        return this._jsonResponse;
    }

    public set jsonResponse(value: boolean) {
        this._jsonResponse = value;
    }

    public getConfig(): ManagerConfig {
        return {
            findAllUrl: this.profile.team.replace(/\/?$/, SpaceManager.BASE_URL),
            onFindAll: (data: SaveSpace[]) => this.listSpaces(data),
            onFindAllAndExport: (data: SaveSpace[]) => this.exportListOfSpaces(data),
        };
    }

    private listSpaces(nodes: SaveSpace[]): void {
        nodes.forEach(node => {
            logger.info(`${node.id} - Name: "${node.name}"`);
        });
    }

    private exportListOfSpaces(spaces: SaveSpace[]): void {
        const filename = uuidv4() + ".json";
        this.writeToFileWithGivenName(JSON.stringify(spaces, ["id", "name"]), filename);
        logger.info(this.fileDownloadedMessage + filename);
    }

    protected getBody(): object {
        return {};
    }

    protected getSerializedFileContent(data: any): string {
        return data;
    }

}
