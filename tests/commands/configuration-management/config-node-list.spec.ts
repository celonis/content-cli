import { NodeTransport } from "../../../src/commands/configuration-management/interfaces/node.interfaces";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { NodeService } from "../../../src/commands/configuration-management/node.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Node list", () => {
  const createNode = (
    id: string,
    key: string,
    name: string,
    parentNodeKey?: string,
  ): NodeTransport => ({
    id: id,
    key: key,
    name: name,
    packageNodeKey: `package-${key}`,
    parentNodeKey: parentNodeKey,
    packageNodeId: `package-node-${id}`,
    type: "VIEW",
    invalidContent: false,
    creationDate: new Date("2024-01-15T10:00:00Z").toISOString(),
    changeDate: new Date("2024-01-20T15:30:00Z").toISOString(),
    createdBy: "user-123",
    updatedBy: "user-456",
    schemaVersion: 1,
    flavor: "STUDIO",
  });

  it("Should list nodes without configuration", async () => {
    const packageKey = "package-key";
    const packageVersion = "1.0.0";
    const limit = 10;
    const offset = 0;

    const node1 = createNode("node-id-1", "node-key-1", "Node 1", "parent-key");
    const node2 = createNode("node-id-2", "node-key-2", "Node 2");

    const response: NodeTransport[] = [node1, node2];

    mockAxiosGet(
      `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes?version=${packageVersion}&withConfiguration=false&limit=${limit}`,
      response,
    );

    await new NodeService(testContext).listNodes(
      packageKey,
      packageVersion,
      limit,
      offset,
      false,
      false,
    );

    expect(loggingTestTransport.logMessages.length).toBe(2);

    expect(loggingTestTransport.logMessages[0].message).toContain(
      JSON.stringify(node1),
    );
    expect(loggingTestTransport.logMessages[1].message).toContain(
      JSON.stringify(node2),
    );
  });

  it("Should list nodes with configuration", async () => {
    const packageKey = "package-key";
    const packageVersion = "1.0.0";
    const limit = 5;
    const offset = 0;

    const node1: NodeTransport = {
      ...createNode("node-id-1", "node-key-1", "Node 1"),
      configuration: {
        setting1: "value1",
        setting2: 42,
      },
    };

    const node2: NodeTransport = {
      ...createNode("node-id-2", "node-key-2", "Node 2"),
      configuration: {
        nestedConfig: {
          key: "value",
        },
      },
    };

    const response: NodeTransport[] = [node1, node2];

    mockAxiosGet(
      `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes?version=${packageVersion}&withConfiguration=true&limit=${limit}`,
      response,
    );

    await new NodeService(testContext).listNodes(
      packageKey,
      packageVersion,
      limit,
      offset,
      true,
      false,
    );

    expect(loggingTestTransport.logMessages.length).toBe(2);

    expect(loggingTestTransport.logMessages[0].message).toContain(
      `${JSON.stringify(node1.configuration)}`,
    );
    expect(loggingTestTransport.logMessages[1].message).toContain(
      `${JSON.stringify(node2.configuration)}`,
    );
  });

  it("Should list nodes with pagination (limit and offset)", async () => {
    const packageKey = "package-key";
    const packageVersion = "2.0.0";
    const limit = 50;
    const offset = 100;

    const node1 = createNode("node-id-101", "node-key-101", "Node 101");

    const response: NodeTransport[] = [node1];

    mockAxiosGet(
      `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes?version=${packageVersion}&withConfiguration=false&limit=${limit}&offset=${offset}`,
      response,
    );

    await new NodeService(testContext).listNodes(
      packageKey,
      packageVersion,
      limit,
      offset,
      false,
      false,
    );

    expect(loggingTestTransport.logMessages.length).toBe(1);
    expect(loggingTestTransport.logMessages[0].message).toContain(
      JSON.stringify(node1),
    );
  });

  it("Should list empty nodes array", async () => {
    const packageKey = "package-key";
    const packageVersion = "1.0.0";
    const limit = 10;
    const offset = 0;

    const response: NodeTransport[] = [];

    mockAxiosGet(
      `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes?version=${packageVersion}&withConfiguration=false&limit=${limit}`,
      response,
    );

    await new NodeService(testContext).listNodes(
      packageKey,
      packageVersion,
      limit,
      offset,
      false,
      false,
    );

    expect(loggingTestTransport.logMessages.length).toBe(0);
  });

  it("Should list nodes and return as JSON", async () => {
    const packageKey = "package-key";
    const packageVersion = "1.0.0";
    const limit = 10;
    const offset = 0;

    const node1 = createNode("node-id-1", "node-key-1", "Node 1");
    const node2 = createNode("node-id-2", "node-key-2", "Node 2");

    const response: NodeTransport[] = [node1, node2];

    mockAxiosGet(
      `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes?version=${packageVersion}&withConfiguration=false&limit=${limit}`,
      response,
    );

    await new NodeService(testContext).listNodes(
      packageKey,
      packageVersion,
      limit,
      offset,
      false,
      true,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      expect.any(String),
      { encoding: "utf-8" },
    );

    const nodes = JSON.parse(
      mockWriteFileSync.mock.calls[0][1],
    ) as NodeTransport[];

    expect(nodes).toEqual([node1, node2]);
    expect(nodes.length).toBe(2);
  });

  it("Should list nodes with configuration and return as JSON", async () => {
    const packageKey = "package-key";
    const packageVersion = "1.0.0";
    const limit = 10;
    const offset = 0;

    const node1: NodeTransport = {
      ...createNode("node-id-1", "node-key-1", "Node 1"),
      configuration: {
        key1: "value1",
        nested: {
          data: true,
        },
      },
    };

    const node2: NodeTransport = {
      ...createNode("node-id-2", "node-key-2", "Node 2"),
      configuration: {
        key2: "value2",
      },
    };

    const response: NodeTransport[] = [node1, node2];

    mockAxiosGet(
      `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes?version=${packageVersion}&withConfiguration=true&limit=${limit}`,
      response,
    );

    await new NodeService(testContext).listNodes(
      packageKey,
      packageVersion,
      limit,
      offset,
      true,
      true,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      expect.any(String),
      { encoding: "utf-8" },
    );

    const nodes = JSON.parse(
      mockWriteFileSync.mock.calls[0][1],
    ) as NodeTransport[];

    expect(nodes).toEqual([node1, node2]);
    expect(nodes[0].configuration).toEqual(node1.configuration);
    expect(nodes[1].configuration).toEqual(node2.configuration);
  });

  it("Should list nodes with invalid configuration", async () => {
    const packageKey = "package-key";
    const packageVersion = "1.0.0";
    const limit = 10;
    const offset = 0;

    const invalidConfigMessage = "Syntax error at line 5";
    const node1: NodeTransport = {
      ...createNode("node-id-1", "node-key-1", "Node 1"),
      invalidContent: true,
      invalidConfiguration: invalidConfigMessage,
    };

    const response: NodeTransport[] = [node1];

    mockAxiosGet(
      `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes?version=${packageVersion}&withConfiguration=false&limit=${limit}`,
      response,
    );

    await new NodeService(testContext).listNodes(
      packageKey,
      packageVersion,
      limit,
      offset,
      false,
      false,
    );

    expect(loggingTestTransport.logMessages.length).toBe(1);
    expect(loggingTestTransport.logMessages[0].message).toContain(
      JSON.stringify(node1.invalidConfiguration),
    );
  });

  it("Should list nodes with invalid configuration and return as JSON", async () => {
    const packageKey = "package-key";
    const packageVersion = "1.0.0";
    const limit = 10;
    const offset = 0;

    const invalidConfigMessage = "Parse error in configuration";
    const node1: NodeTransport = {
      ...createNode("node-id-1", "node-key-1", "Node 1"),
      invalidContent: true,
      invalidConfiguration: invalidConfigMessage,
    };

    const node2 = createNode("node-id-2", "node-key-2", "Node 2");

    const response: NodeTransport[] = [node1, node2];

    mockAxiosGet(
      `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes?version=${packageVersion}&withConfiguration=false&limit=${limit}`,
      response,
    );

    await new NodeService(testContext).listNodes(
      packageKey,
      packageVersion,
      limit,
      offset,
      false,
      true,
    );

    const expectedFileName = loggingTestTransport.logMessages[0].message.split(
      FileService.fileDownloadedMessage,
    )[1];

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), expectedFileName),
      expect.any(String),
      { encoding: "utf-8" },
    );

    const nodes = JSON.parse(
      mockWriteFileSync.mock.calls[0][1],
    ) as NodeTransport[];

    expect(nodes).toEqual([node1, node2]);
    expect(nodes[0].invalidConfiguration).toEqual(invalidConfigMessage);
    expect(nodes[0].invalidContent).toBe(true);
    expect(nodes[1].invalidContent).toBe(false);
  });

  it("Should list single node", async () => {
    const packageKey = "package-key";
    const packageVersion = "1.0.0";
    const limit = 1;
    const offset = 0;

    const node1 = createNode(
      "node-id-1",
      "node-key-1",
      "Single Node",
      "parent-key",
    );

    const response: NodeTransport[] = [node1];

    mockAxiosGet(
      `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes?version=${packageVersion}&withConfiguration=false&limit=${limit}`,
      response,
    );

    await new NodeService(testContext).listNodes(
      packageKey,
      packageVersion,
      limit,
      offset,
      false,
      false,
    );

    expect(loggingTestTransport.logMessages.length).toBe(1);
    expect(loggingTestTransport.logMessages[0].message).toContain(
      JSON.stringify(node1),
    );
  });

  it("Should list multiple nodes without parent keys", async () => {
    const packageKey = "package-key";
    const packageVersion = "1.0.0";
    const limit = 10;
    const offset = 0;

    const node1 = createNode("node-id-1", "node-key-1", "Node 1");
    const node2 = createNode("node-id-2", "node-key-2", "Node 2");
    const node3 = createNode("node-id-3", "node-key-3", "Node 3");

    const response: NodeTransport[] = [node1, node2, node3];

    mockAxiosGet(
      `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes?version=${packageVersion}&withConfiguration=false&limit=${limit}`,
      response,
    );

    await new NodeService(testContext).listNodes(
      packageKey,
      packageVersion,
      limit,
      offset,
      false,
      false,
    );

    expect(loggingTestTransport.logMessages.length).toBe(3);

    const parentKeyMessages = loggingTestTransport.logMessages.filter(log =>
      log.message.includes("Parent Node Key"),
    );
    expect(parentKeyMessages.length).toBe(0);
  });
});
