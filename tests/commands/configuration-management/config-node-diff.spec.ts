import { NodeConfigurationDiffTransport } from "../../../src/commands/configuration-management/interfaces/node-diff.interfaces";
import { NodeConfigurationChangeType } from "../../../src/commands/configuration-management/interfaces/diff-package.interfaces";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { NodeDiffService } from "../../../src/commands/configuration-management/node-diff.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Node diff", () => {
    const packageKey = "test-package-key";
    const nodeKey = "test-node-key";
    const baseVersion = "1.0.0";
    const compareVersion = "2.0.0";

    const nodeDiff: NodeConfigurationDiffTransport = {
        packageKey: packageKey,
        nodeKey: nodeKey,
        parentNodeKey: "parent-node-key",
        name: "Test Node",
        type: "VIEW",
        invalidContent: false,
        changeDate: "2024-01-01T10:00:00.000Z",
        updatedBy: "user@celonis.com",
        changeType: NodeConfigurationChangeType.CHANGED,
        changes: {
            op: "replace",
            path: "/config/value",
            from: "/config/oldValue",
            value: { newValue: "updated" },
            fromValue: { oldValue: "original" },
        },
        metadataChanges: {
            op: "replace",
            path: "/metadata/title",
            from: "/metadata/oldTitle",
            value: { title: "New Title" },
            fromValue: { title: "Old Title" },
        },
    };

    it("Should diff two versions of a node", async () => {
        const url = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/diff/configuration?baseVersion=${baseVersion}&compareVersion=${compareVersion}`;
        mockAxiosGet(url, nodeDiff);

        await new NodeDiffService(testContext).diff(packageKey, nodeKey, baseVersion, compareVersion, false);

        expect(loggingTestTransport.logMessages.length).toBe(10);
        expect(loggingTestTransport.logMessages[0].message.trim()).toEqual(`Package Key: ${nodeDiff.packageKey}`);
        expect(loggingTestTransport.logMessages[1].message.trim()).toEqual(`Node Key: ${nodeDiff.nodeKey}`);
        expect(loggingTestTransport.logMessages[2].message.trim()).toEqual(`Name: ${nodeDiff.name}`);
        expect(loggingTestTransport.logMessages[3].message.trim()).toEqual(`Type: ${nodeDiff.type}`);
        expect(loggingTestTransport.logMessages[4].message.trim()).toEqual(
            `Parent Node Key: ${nodeDiff.parentNodeKey}`
        );
        expect(loggingTestTransport.logMessages[5].message.trim()).toEqual(`Change Date: ${nodeDiff.changeDate}`);
        expect(loggingTestTransport.logMessages[6].message.trim()).toEqual(`Updated By: ${nodeDiff.updatedBy}`);
        expect(loggingTestTransport.logMessages[7].message.trim()).toEqual(`Change Type: ${nodeDiff.changeType}`);
        expect(loggingTestTransport.logMessages[8].message.trim()).toEqual(
            `Changes: ${JSON.stringify(nodeDiff.changes)}`
        );
        expect(loggingTestTransport.logMessages[9].message.trim()).toEqual(
            `Metadata Changes: ${JSON.stringify(nodeDiff.metadataChanges)}`
        );
    });

    it("Should diff two versions of a node and return as JSON", async () => {
        const url = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/diff/configuration?baseVersion=${baseVersion}&compareVersion=${compareVersion}`;
        mockAxiosGet(url, nodeDiff);

        await new NodeDiffService(testContext).diff(packageKey, nodeKey, baseVersion, compareVersion, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(
            FileService.fileDownloadedMessage
        )[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            { encoding: "utf-8" }
        );

        const savedDiff = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as NodeConfigurationDiffTransport;

        // Dates are serialized as strings in JSON
        expect(savedDiff.packageKey).toEqual(nodeDiff.packageKey);
        expect(savedDiff.nodeKey).toEqual(nodeDiff.nodeKey);
        expect(savedDiff.name).toEqual(nodeDiff.name);
        expect(savedDiff.type).toEqual(nodeDiff.type);
        expect(savedDiff.changeType).toEqual(nodeDiff.changeType);
        expect(savedDiff.changes).toEqual(nodeDiff.changes);
        expect(savedDiff.metadataChanges).toEqual(nodeDiff.metadataChanges);
    });

    it("Should diff node without parent node key", async () => {
        const nodeDiffWithoutParent: NodeConfigurationDiffTransport = {
            ...nodeDiff,
            parentNodeKey: undefined,
        };

        const url = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/diff/configuration?baseVersion=${baseVersion}&compareVersion=${compareVersion}`;
        mockAxiosGet(url, nodeDiffWithoutParent);

        await new NodeDiffService(testContext).diff(packageKey, nodeKey, baseVersion, compareVersion, false);

        expect(loggingTestTransport.logMessages.length).toBe(9);
        // Verify that parent node key is not logged
        const parentNodeKeyMessage = loggingTestTransport.logMessages.find(log =>
            log.message.includes("Parent Node Key")
        );
        expect(parentNodeKeyMessage).toBeUndefined();
    });

    it.each(Object.keys(NodeConfigurationChangeType))("Should diff node with %s change type", async changeType => {
        const changeTypeNodeDiff: NodeConfigurationDiffTransport = {
            ...nodeDiff,
            changeType: NodeConfigurationChangeType[changeType],
            changes: {
                op: "add",
                path: "/config/newField",
                from: "",
                value: { newField: "value" },
                fromValue: {},
            },
            metadataChanges: {
                op: "add",
                path: "/metadata/created",
                from: "",
                value: { created: "2024-01-01" },
                fromValue: {},
            },
        };

        const url = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/diff/configuration?baseVersion=${baseVersion}&compareVersion=${compareVersion}`;
        mockAxiosGet(url, changeTypeNodeDiff);

        await new NodeDiffService(testContext).diff(packageKey, nodeKey, baseVersion, compareVersion, false);

        expect(loggingTestTransport.logMessages.length).toBe(10);
        expect(loggingTestTransport.logMessages[7].message.trim()).toEqual(`Change Type: ${changeType}`);
    });

    it("Should diff node with complex nested changes", async () => {
        const complexNodeDiff: NodeConfigurationDiffTransport = {
            ...nodeDiff,
            changes: {
                op: "replace",
                path: "/config/nested/deep/value",
                from: "/config/nested/deep/oldValue",
                value: {
                    nested: {
                        deep: {
                            value: "new",
                            additionalField: 123,
                        },
                    },
                },
                fromValue: {
                    nested: {
                        deep: {
                            oldValue: "original",
                        },
                    },
                },
            },
            metadataChanges: {
                op: "add",
                path: "/metadata/tags",
                from: "",
                value: { tags: ["tag1", "tag2", "tag3"] },
                fromValue: {},
            },
        };

        const url = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/diff/configuration?baseVersion=${baseVersion}&compareVersion=${compareVersion}`;
        mockAxiosGet(url, complexNodeDiff);

        await new NodeDiffService(testContext).diff(packageKey, nodeKey, baseVersion, compareVersion, false);

        const changesMessage = loggingTestTransport.logMessages.find(log => log.message.includes("Changes:"));
        const metadataChangesMessage = loggingTestTransport.logMessages.find(log =>
            log.message.includes("Metadata Changes:")
        );

        expect(changesMessage).toBeDefined();
        expect(metadataChangesMessage).toBeDefined();
        expect(changesMessage.message.trim()).toEqual(`Changes: ${JSON.stringify(complexNodeDiff.changes)}`);
        expect(metadataChangesMessage.message.trim()).toEqual(
            `Metadata Changes: ${JSON.stringify(complexNodeDiff.metadataChanges)}`
        );
    });

    it("Should diff node with empty changes", async () => {
        const emptyChangesNodeDiff: NodeConfigurationDiffTransport = {
            ...nodeDiff,
            changeType: NodeConfigurationChangeType.UNCHANGED,
            changes: {
                op: "",
                path: "",
                from: "",
                value: {},
                fromValue: {},
            },
            metadataChanges: {
                op: "",
                path: "",
                from: "",
                value: {},
                fromValue: {},
            },
        };

        const url = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/diff/configuration?baseVersion=${baseVersion}&compareVersion=${compareVersion}`;
        mockAxiosGet(url, emptyChangesNodeDiff);

        await new NodeDiffService(testContext).diff(packageKey, nodeKey, baseVersion, compareVersion, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(
            FileService.fileDownloadedMessage
        )[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            { encoding: "utf-8" }
        );

        const savedDiff = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as NodeConfigurationDiffTransport;

        expect(savedDiff.changeType).toBe(NodeConfigurationChangeType.UNCHANGED);
        expect(savedDiff.changes).toEqual(emptyChangesNodeDiff.changes);
    });

    it("Should verify all logging output fields are present", async () => {
        const url = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/diff/configuration?baseVersion=${baseVersion}&compareVersion=${compareVersion}`;
        mockAxiosGet(url, nodeDiff);

        await new NodeDiffService(testContext).diff(packageKey, nodeKey, baseVersion, compareVersion, false);

        // Verify all expected fields are logged
        const loggedFields = loggingTestTransport.logMessages.map(log => log.message);
        const allLogsAsString = loggedFields.join("\n");

        expect(allLogsAsString).toContain("Package Key:");
        expect(allLogsAsString).toContain("Node Key:");
        expect(allLogsAsString).toContain("Name:");
        expect(allLogsAsString).toContain("Type:");
        expect(allLogsAsString).toContain("Parent Node Key:");
        expect(allLogsAsString).toContain("Change Date:");
        expect(allLogsAsString).toContain("Updated By:");
        expect(allLogsAsString).toContain("Change Type:");
        expect(allLogsAsString).toContain("Changes:");
        expect(allLogsAsString).toContain("Metadata Changes:");
    });

    it("Should handle different node types", async () => {
        const nodeTypes = ["VIEW", "VARIABLE", "COMPONENT", "ACTION", "SKILL"];

        for (const nodeType of nodeTypes) {
            loggingTestTransport.logMessages = [];

            const typedNodeDiff: NodeConfigurationDiffTransport = {
                ...nodeDiff,
                type: nodeType,
            };

            const url = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/diff/configuration?baseVersion=${baseVersion}&compareVersion=${compareVersion}`;
            mockAxiosGet(url, typedNodeDiff);

            await new NodeDiffService(testContext).diff(packageKey, nodeKey, baseVersion, compareVersion, false);

            expect(loggingTestTransport.logMessages[3].message).toContain(`Type: ${nodeType}`);
        }
    });

    it("Should format dates as ISO strings in output", async () => {
        const specificDate = "2024-06-15T14:30:45.123Z";
        const nodeDiffWithDate: NodeConfigurationDiffTransport = {
            ...nodeDiff,
            changeDate: specificDate,
            updatedBy: "admin@celonis.com",
        };

        const url = `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/diff/configuration?baseVersion=${baseVersion}&compareVersion=${compareVersion}`;
        mockAxiosGet(url, nodeDiffWithDate);

        await new NodeDiffService(testContext).diff(packageKey, nodeKey, baseVersion, compareVersion, false);

        const changeDateLog = loggingTestTransport.logMessages.find(log => log.message.includes("Change Date:"));
        expect(changeDateLog.message).toContain(specificDate);
    });
});
