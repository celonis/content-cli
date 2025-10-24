import { NodeTransport } from "../../../src/commands/configuration-management/interfaces/node.interfaces";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { NodeService } from "../../../src/commands/configuration-management/node.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Node find", () => {
    const node: NodeTransport = {
        id: "node-id",
        key: "node-key",
        name: "Node Name",
        packageNodeKey: "package-node-key",
        parentNodeKey: "parent-node-key",
        packageNodeId: "package-node-id",
        type: "VIEW",
        invalidContent: false,
        creationDate: new Date().toISOString(),
        changeDate: new Date().toISOString(),
        createdBy: "user-id",
        updatedBy: "user-id",
        schemaVersion: 1,
        flavor: "STUDIO",
    };

    it("Should find node without configuration", async () => {
        const packageKey = "package-key";
        const nodeKey = "node-key";
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}?withConfiguration=false`, node);

        await new NodeService(testContext).findNode(packageKey, nodeKey, false, false);

        expect(loggingTestTransport.logMessages.length).toBe(11);
        expect(loggingTestTransport.logMessages[0].message).toContain(`ID: ${node.id}`);
        expect(loggingTestTransport.logMessages[1].message).toContain(`Key: ${node.key}`);
        expect(loggingTestTransport.logMessages[2].message).toContain(`Name: ${node.name}`);
        expect(loggingTestTransport.logMessages[3].message).toContain(`Type: ${node.type}`);
        expect(loggingTestTransport.logMessages[4].message).toContain(`Package Node Key: ${node.packageNodeKey}`);
        expect(loggingTestTransport.logMessages[5].message).toContain(`Parent Node Key: ${node.parentNodeKey}`);
        expect(loggingTestTransport.logMessages[6].message).toContain(`Created By: ${node.createdBy}`);
        expect(loggingTestTransport.logMessages[7].message).toContain(`Updated By: ${node.updatedBy}`);
        expect(loggingTestTransport.logMessages[8].message).toContain(`Creation Date: ${new Date(node.creationDate).toISOString()}`);
        expect(loggingTestTransport.logMessages[9].message).toContain(`Change Date: ${new Date(node.changeDate).toISOString()}`);
        expect(loggingTestTransport.logMessages[10].message).toContain(`Flavor: ${node.flavor}`);
    });

    it("Should find node with configuration", async () => {
        const packageKey = "package-key";
        const nodeKey = "node-key";
        const nodeWithConfig: NodeTransport = {
            ...node,
            configuration: {
                someKey: "someValue",
                anotherKey: 123,
            },
        };

        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}?withConfiguration=true`, nodeWithConfig);

        await new NodeService(testContext).findNode(packageKey, nodeKey, true, false);

        expect(loggingTestTransport.logMessages.length).toBe(12);
        expect(loggingTestTransport.logMessages[0].message).toContain(`ID: ${nodeWithConfig.id}`);
        expect(loggingTestTransport.logMessages[10].message).toContain(`Configuration: ${JSON.stringify(nodeWithConfig.configuration, null, 2)}`);
        expect(loggingTestTransport.logMessages[11].message).toContain(`Flavor: ${nodeWithConfig.flavor}`);
    });

    it("Should find node without parent node key", async () => {
        const packageKey = "package-key";
        const nodeKey = "node-key";
        const nodeWithoutParent: NodeTransport = {
            ...node,
            parentNodeKey: undefined,
        };

        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}?withConfiguration=false`, nodeWithoutParent);

        await new NodeService(testContext).findNode(packageKey, nodeKey, false, false);

        expect(loggingTestTransport.logMessages.length).toBe(10);
        // Verify that parent node key is not logged
        const parentNodeKeyMessage = loggingTestTransport.logMessages.find(log => log.message.includes("Parent Node Key"));
        expect(parentNodeKeyMessage).toBeUndefined();
    });

    it("Should find node and return as JSON", async () => {
        const packageKey = "package-key";
        const nodeKey = "node-key";
        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}?withConfiguration=false`, node);

        await new NodeService(testContext).findNode(packageKey, nodeKey, false, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const nodeTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as NodeTransport;

        expect(nodeTransport).toEqual(node);
    });

    it("Should find node with configuration and return as JSON", async () => {
        const packageKey = "package-key";
        const nodeKey = "node-key";
        const nodeWithConfig: NodeTransport = {
            ...node,
            configuration: {
                someKey: "someValue",
                nested: {
                    value: true,
                },
            },
        };

        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}?withConfiguration=true`, nodeWithConfig);

        await new NodeService(testContext).findNode(packageKey, nodeKey, true, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const nodeTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as NodeTransport;

        expect(nodeTransport).toEqual(nodeWithConfig);
        expect(nodeTransport.configuration).toEqual(nodeWithConfig.configuration);
    });

    it("Should find node with invalid configuration", async () => {
        const packageKey = "package-key";
        const nodeKey = "node-key";
        const invalidConfigMessage = "Invalid JSON: Unexpected token at position 10";
        const nodeWithInvalidConfig: NodeTransport = {
            ...node,
            invalidContent: true,
            invalidConfiguration: invalidConfigMessage,
        };

        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}?withConfiguration=false`, nodeWithInvalidConfig);

        await new NodeService(testContext).findNode(packageKey, nodeKey, false, false);

        expect(loggingTestTransport.logMessages.length).toBe(12);
        expect(loggingTestTransport.logMessages[0].message).toContain(`ID: ${nodeWithInvalidConfig.id}`);
        expect(loggingTestTransport.logMessages[10].message).toContain(`Invalid Configuration: ${invalidConfigMessage}`);
        expect(loggingTestTransport.logMessages[11].message).toContain(`Flavor: ${nodeWithInvalidConfig.flavor}`);
    });

    it("Should find node with invalid configuration and return as JSON", async () => {
        const packageKey = "package-key";
        const nodeKey = "node-key";
        const invalidConfigMessage = "Syntax error in configuration";
        const nodeWithInvalidConfig: NodeTransport = {
            ...node,
            invalidContent: true,
            invalidConfiguration: invalidConfigMessage,
        };

        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}?withConfiguration=false`, nodeWithInvalidConfig);

        await new NodeService(testContext).findNode(packageKey, nodeKey, false, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8"});

        const nodeTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as NodeTransport;

        expect(nodeTransport).toEqual(nodeWithInvalidConfig);
        expect(nodeTransport.invalidConfiguration).toEqual(invalidConfigMessage);
        expect(nodeTransport.invalidContent).toBe(true);
    });
});

