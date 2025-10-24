import { mockAxiosGet } from "../../utls/http-requests-mock";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport} from "../../jest.setup";

import { NodeDiffService } from "../../../src/commands/configuration-management/node-diff.service";
import { NodeConfigurationChangeType,
} from "../../../src/commands/configuration-management/interfaces/diff-package.interfaces";
import {
    NodeConfigurationDiffTransport
} from "../../../src/commands/configuration-management/interfaces/node-diff.interfaces";

describe("Node diff", () => {
    const nodeDiff: NodeConfigurationDiffTransport = {
        packageKey: "package-key",
        nodeKey: "node-key",
        parentNodeKey: "parent-node-key",
        name: "Node Name",
        type: "VIEW",
        changeType: NodeConfigurationChangeType.ADDED,
        invalidContent: false,
        changeDate: new Date().toISOString(),
        updatedBy: "user-id",
        changes: {
            op: "add",
            path: "/test",
            from: "bbb",
            value: JSON.parse("234"),
            fromValue: null
        },
        metadataChanges: {
            op: "add",
            path: "/test",
            from: "bbb",
            value: JSON.parse("234"),
            fromValue: null
        }
    };

    it("Should get node diff", async () => {
        const packageKey = "package-key";
        const nodeKey = "node-key";
        const baseVersion = "1.0.0";
        const compareVersion = "1.0.0";

        mockAxiosGet(`https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/diff/configuration?baseVersion=${baseVersion}&compareVersion=${compareVersion}`, nodeDiff);

        await new NodeDiffService(testContext).diff(packageKey, nodeKey, baseVersion, compareVersion, false);

        expect(loggingTestTransport.logMessages.length).toBe(11);
        expect(loggingTestTransport.logMessages[2].message).toContain(`Name: ${nodeDiff.name}`);
        expect(loggingTestTransport.logMessages[3].message).toContain(`Type: ${nodeDiff.type}`);
        expect(loggingTestTransport.logMessages[5].message).toContain(`Parent Node Key: ${nodeDiff.parentNodeKey}`);
        expect(loggingTestTransport.logMessages[7].message).toContain(`Updated By: ${nodeDiff.updatedBy}`);
        expect(loggingTestTransport.logMessages[9].message).toContain(`Change Date: ${new Date(nodeDiff.changeDate).toISOString()}`);
    });
});

