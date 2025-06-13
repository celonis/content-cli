/**
 * Commands related to the Data Pool Connections.
 */

import { Command, OptionValues } from "commander";
import { Configurator } from "../../../core/command/module-handler";
import { ConnectionCommandService } from "./connection-command.service";
import { Context } from "../../../core/command/cli-context";

export class ConnectionCommands {

    register(context: Context, configurator: Configurator) {
        const listCommand = configurator.command("list");
        listCommand.command("connection")
            .description("Command to list all connections in a Data Pool")
            .requiredOption("--dataPoolId <dataPoolId>", "ID of the data pool")
            .action(this.listConnections);

        const getCommand = configurator.command("get");
        getCommand.command("connection")
            .description("Programmatically read properties of your connections")
            .requiredOption("--dataPoolId <dataPoolId>", "Id of the data pool you want to update")
            .requiredOption("--connectionId <connectionId>", "Id of the connection you want to update")
            .action(this.getCommandProperties);

        const setCommand = configurator.command("set");
        setCommand.command("connection")
            .description("Programmatically update properties of your connections")
            .requiredOption("--dataPoolId <dataPoolId>", "Id of the data pool you want to update")
            .requiredOption("--connectionId <connectionId>", "Id of the connection you want to update")
            .requiredOption("--property <property>", "The property you want to update")
            .requiredOption("--value <value>", "The value you want to update")
            .action(this.updateConnectionProperty);
    }

    async getCommandProperties(context: Context, command: Command, options: OptionValues) {
        await new ConnectionCommandService(context).getProperties(options.dataPoolId, options.connectionId);
    }

    async listConnections(context: Context, command: Command, options: OptionValues) {
        await new ConnectionCommandService(context).listConnections(options.dataPoolId);
    }

    async updateConnectionProperty(context: Context, command: Command, options: OptionValues) {
        await new ConnectionCommandService(context).updateProperty(options.dataPoolId, options.connectionId, options.property, options.value);
    }
}
