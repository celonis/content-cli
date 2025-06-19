import { Context } from "../../../core/command/cli-context";
import { ConnectionService } from "./connection.service";

export class ConnectionCommandService {

    private connectionService: ConnectionService;

    constructor(context: Context) {
        this.connectionService = new ConnectionService(context);
    }

    public async updateProperty(dataPoolId: string, connectionId: string, property: string, value: string): Promise<void>{
        await this.connectionService.updateProperty(dataPoolId, connectionId, property, value);
    }

    public async getProperties(dataPoolId: string, connectionId: string): Promise<void> {
        await this.connectionService.listProperties(dataPoolId, connectionId);
    }

    public async listConnections(dataPoolId: string): Promise<any> {
        await this.connectionService.findAllConnections(dataPoolId);
    }
}
