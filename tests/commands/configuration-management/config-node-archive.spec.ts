import { mockAxiosDelete } from "../../utls/http-requests-mock";
import { NodeService } from "../../../src/commands/configuration-management/node.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";

describe("Node archive", () => {
    const packageKey = "package-key";
    const nodeKey = "node-key";

    it("Should archive node without force", async () => {
        const apiUrl = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}/archive?force=false`;
        mockAxiosDelete(apiUrl);

        await new NodeService(testContext).archiveNode(packageKey, nodeKey, false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(`Node ${nodeKey} in package ${packageKey} archived successfully.`);
    });

    it("Should archive node with force", async () => {
        const apiUrl = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}/archive?force=true`;
        mockAxiosDelete(apiUrl);

        await new NodeService(testContext).archiveNode(packageKey, nodeKey, true);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(`Node ${nodeKey} in package ${packageKey} archived successfully.`);
    });
});
