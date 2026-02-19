import {v4 as uuidv4} from "uuid";
import {Context} from "../../../core/command/cli-context";
import {BaseManager} from "../../../core/http/http-shared/base.manager";
import {ManagerConfig} from "../../../core/http/http-shared/manager-config.interface";
import {SpaceTransport} from "../interfaces/space.interface";
import {logger} from "../../../core/utils/logger";

export class SpaceManager extends BaseManager {
    private static BASE_URL = "/package-manager/api/spaces";

    private _jsonResponse: boolean;

    constructor(context: Context) {
        super(context);
    }

    public get jsonResponse(): boolean {
        return this._jsonResponse;
    }

    public set jsonResponse(value: boolean) {
        this._jsonResponse = value;
    }

    public getConfig(): ManagerConfig {
        return {
            findAllUrl: SpaceManager.BASE_URL,
            onFindAll: (data: SpaceTransport[]) => this.listSpaces(data),
        };
    }

    private listSpaces(nodes: SpaceTransport[]): void {
        if (this.jsonResponse) {
            const filename = uuidv4() + ".json";
            this.writeToFileWithGivenName(JSON.stringify(nodes, ["id", "name"]), filename);
            logger.info(this.fileDownloadedMessage + filename);
        } else {
            nodes.forEach(node => {
                logger.info(`${node.id} - Name: "${node.name}"`);
            });
        }
    }

    protected getBody(): object {
        return {};
    }

    protected getSerializedFileContent(data: any): string {
        return data;
    }
}
