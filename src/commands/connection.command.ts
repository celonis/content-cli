import { ContentService } from "../services/content.service";
import { DataPoolManagerFactory } from "../content/factory/data-pool-manager.factory";
import { connectionService } from "../services/connection/connection.service";

export class ConnectionCommand {
    
    public async updateProperty(profile: string, dataPoolId: string, connectionId: string, property: string, value: string): Promise<void>{
        await connectionService.updateProperty(dataPoolId, connectionId, property, value);
    }

    public async getProperties(profile: string, dataPoolId: string, connectionId: string): Promise<void> {
        await connectionService.listProperties(dataPoolId, connectionId);
    }

    public async listConnections(profile: string, dataPoolId: string): Promise<any> {
        return await connectionService.findAllConnections(dataPoolId);
    }
}
