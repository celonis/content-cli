import { NodeTransport, UpdateNodeTransport } from "../../../src/commands/configuration-management/interfaces/node.interfaces";
import { mockAxiosPut, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { NodeService } from "../../../src/commands/configuration-management/node.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Node update", () => {
    const packageKey = "package-key";
    const nodeKey = "node-key";
    const apiUrl = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}`;
    const validateOnlyUrl = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}?validate=true`;

    const updatedNode: NodeTransport = {
        id: "node-id",
        key: nodeKey,
        name: "Updated Node Name",
        packageNodeKey: packageKey,
        parentNodeKey: packageKey,
        packageNodeId: "package-node-id",
        type: "VIEW",
        invalidContent: false,
        creationDate: new Date().toISOString(),
        changeDate: new Date().toISOString(),
        createdBy: "user-id",
        updatedBy: "user-id",
        schemaVersion: 2,
        flavor: "STUDIO",
    };

    const updateTransport: UpdateNodeTransport = {
        name: "Updated Node Name",
        parentNodeKey: packageKey,
        configuration: { updatedKey: "updatedValue" },
    };

    it("Should update node and print result", async () => {
        mockAxiosPut(apiUrl, updatedNode);

        await new NodeService(testContext).updateNode(packageKey, nodeKey, JSON.stringify(updateTransport), false, false);

        expect(loggingTestTransport.logMessages.length).toBe(11);
        expect(loggingTestTransport.logMessages[0].message).toContain(`ID: ${updatedNode.id}`);
        expect(loggingTestTransport.logMessages[1].message).toContain(`Key: ${updatedNode.key}`);
        expect(loggingTestTransport.logMessages[2].message).toContain(`Name: ${updatedNode.name}`);
    });

    it("Should update node and return as JSON", async () => {
        mockAxiosPut(apiUrl, updatedNode);

        await new NodeService(testContext).updateNode(packageKey, nodeKey, JSON.stringify(updateTransport), false, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8", mode: 0o600});

        const savedTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as NodeTransport;

        expect(savedTransport).toEqual(updatedNode);
    });

    it("Should send correct request body", async () => {
        mockAxiosPut(apiUrl, updatedNode);

        await new NodeService(testContext).updateNode(packageKey, nodeKey, JSON.stringify(updateTransport), false, false);

        const requestBody = JSON.parse(mockedPostRequestBodyByUrl.get(apiUrl));
        expect(requestBody.name).toBe(updateTransport.name);
        expect(requestBody.parentNodeKey).toBe(updateTransport.parentNodeKey);
        expect(requestBody.configuration).toEqual(updateTransport.configuration);
    });

    it("Should call validate-only endpoint when validateOnly=true", async () => {
        mockAxiosPut(validateOnlyUrl, undefined);

        await new NodeService(testContext).updateNode(packageKey, nodeKey, JSON.stringify(updateTransport), true, false);

        expect(mockWriteFileSync).not.toHaveBeenCalled();
        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            `Validation successful for node ${nodeKey} in package ${packageKey}.`
        );
    });
});
