import { logger } from "../../../core/utils/logger";
import { Context } from "../../../core/command/cli-context";
import { DataPoolApi } from "../data-pool/data-pool-api";

export class ConnectionService {
  private dataPoolApi: DataPoolApi;

  constructor(context: Context) {
    this.dataPoolApi = new DataPoolApi(context);
  }

  public async findAllConnections(dataPoolId: string): Promise<any[]> {
    const connections = await this.dataPoolApi.listConnections(dataPoolId);
    connections.forEach(connection => {
      logger.info(
        `Connection ID: ${connection.id} - Name: ${connection.name} - Type: ${connection.type}`,
      );
    });
    return connections;
  }

  public async listProperties(
    dataPoolId: string,
    connectionId: string,
  ): Promise<any[]> {
    const connection = await this.dataPoolApi.getConnection(
      dataPoolId,
      connectionId,
    );
    const type = connection.type;
    const typedConnection = await this.dataPoolApi.getTypedConnection(
      dataPoolId,
      connectionId,
      type,
    );
    logger.info(
      `Connection ID: ${connection.id} - Name: ${connection.name} - Type: ${connection.type}`,
    );
    logger.info("Properties:");
    for (const k in typedConnection) {
      if (typeof typedConnection[k] === "object") {
        for (const o in typedConnection[k]) {
          logger.info(
            `  ${k}.${o} : ${typeof typedConnection[k][o]} := ${typedConnection[k][o]}`,
          );
        }
      } else {
        logger.info(
          `  ${k} : ${typeof typedConnection[k]} := ${typedConnection[k]}`,
        );
      }
    }
    return typedConnection;
  }

  public async updateProperty(
    dataPoolId: string,
    connectionId: string,
    property: string,
    value: string,
  ): Promise<void> {
    const connection = await this.dataPoolApi.getConnection(
      dataPoolId,
      connectionId,
    );
    const type = connection.type;
    const typedConnection = await this.dataPoolApi.getTypedConnection(
      dataPoolId,
      connectionId,
      type,
    );
    const parts = property.split(".");
    // update the typed connection object
    let currentObject = typedConnection;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (currentObject.hasOwnProperty(part)) {
        if (i < parts.length - 1) {
          currentObject = currentObject[part];
        } else {
          currentObject[part] = value;
        }
      } else {
        logger.error(`Property ${property} not found on connection.`);
        return;
      }
    }
    await this.dataPoolApi.updateTypedConnection(
      dataPoolId,
      connectionId,
      type,
      typedConnection,
    );
    logger.info(`Property ${property} updated.`);
  }
}
