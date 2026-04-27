import { NodeTransport, SaveNodeTransport } from "../../../src/commands/configuration-management/interfaces/node.interfaces";
import { mockAxiosPost, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { NodeService } from "../../../src/commands/configuration-management/node.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Node create", () => {
    const packageKey = "package-key";
    const apiUrl = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes`;
    const validateOnlyUrl = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes?validate=true`;

    const createdNode: NodeTransport = {
        id: "new-node-id",
        key: "new-node-key",
        name: "New Node",
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

    const saveTransport: SaveNodeTransport = {
        key: "new-node-key",
        name: "New Node",
        parentNodeKey: packageKey,
        type: "VIEW",
        configuration: { someKey: "someValue" },
    };

    it("Should create node and print result", async () => {
        mockAxiosPost(apiUrl, createdNode);

        await new NodeService(testContext).createNode(packageKey, JSON.stringify(saveTransport), undefined, false, false);

        expect(loggingTestTransport.logMessages.length).toBe(11);
        expect(loggingTestTransport.logMessages[0].message).toContain(`ID: ${createdNode.id}`);
        expect(loggingTestTransport.logMessages[1].message).toContain(`Key: ${createdNode.key}`);
        expect(loggingTestTransport.logMessages[2].message).toContain(`Name: ${createdNode.name}`);
    });

    it("Should create node and return as JSON", async () => {
        mockAxiosPost(apiUrl, createdNode);

        await new NodeService(testContext).createNode(packageKey, JSON.stringify(saveTransport), undefined, false, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(path.resolve(process.cwd(), expectedFileName), expect.any(String), {encoding: "utf-8", mode: 0o600});

        const savedTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as NodeTransport;

        expect(savedTransport).toEqual(createdNode);
    });

    it("Should send correct request body", async () => {
        mockAxiosPost(apiUrl, createdNode);

        await new NodeService(testContext).createNode(packageKey, JSON.stringify(saveTransport), undefined, false, false);

        const requestBody = JSON.parse(mockedPostRequestBodyByUrl.get(apiUrl));
        expect(requestBody.key).toBe(saveTransport.key);
        expect(requestBody.name).toBe(saveTransport.name);
        expect(requestBody.parentNodeKey).toBe(saveTransport.parentNodeKey);
        expect(requestBody.type).toBe(saveTransport.type);
    });

    it("Should call validate-only endpoint when validateOnly=true", async () => {
        mockAxiosPost(validateOnlyUrl, undefined);

        await new NodeService(testContext).createNode(packageKey, JSON.stringify(saveTransport), undefined, true, false);

        expect(mockWriteFileSync).not.toHaveBeenCalled();
        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            `Validation successful for node ${saveTransport.key} in package ${packageKey}.`
        );
    });
});
