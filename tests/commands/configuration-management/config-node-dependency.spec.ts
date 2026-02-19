import {NodeDependencyTransport} from "../../../src/commands/configuration-management/interfaces/node-dependency.interfaces";
import {mockAxiosGet} from "../../utls/http-requests-mock";
import {NodeDependencyService} from "../../../src/commands/configuration-management/node-dependency.service";
import {testContext} from "../../utls/test-context";
import {loggingTestTransport, mockWriteFileSync} from "../../jest.setup";
import {FileService} from "../../../src/core/utils/file-service";
import * as path from "path";

describe("Node Dependencies", () => {
    const packageKey = "test-package-key";
    const nodeKey = "test-node-key";
    const version = "1.0.0";

    const dependencies: NodeDependencyTransport[] = [
        {
            packageKey: "dependency-package-1",
            key: "dependency-key-1",
            type: "ANALYSIS",
        },
        {
            packageKey: "dependency-package-2",
            key: "dependency-key-2",
            type: "VIEW",
        },
        {
            packageKey: "dependency-package-3",
            key: "dependency-key-3",
            type: "SKILL",
        },
    ];

    it("Should list node dependencies and display in console", async () => {
        mockAxiosGet(
            `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/dependencies?version=${version}`,
            dependencies
        );

        await new NodeDependencyService(testContext).listNodeDependencies(packageKey, nodeKey, version, false);

        expect(loggingTestTransport.logMessages.length).toBe(4);
        expect(loggingTestTransport.logMessages[0].message.trim()).toBe("Found 3 dependencies:");
        expect(loggingTestTransport.logMessages[1].message).toContain(JSON.stringify(dependencies[0]));
        expect(loggingTestTransport.logMessages[2].message).toContain(JSON.stringify(dependencies[1]));
        expect(loggingTestTransport.logMessages[3].message).toContain(JSON.stringify(dependencies[2]));
    });

    it("Should list node dependencies and return as JSON", async () => {
        mockAxiosGet(
            `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/dependencies?version=${version}`,
            dependencies
        );

        await new NodeDependencyService(testContext).listNodeDependencies(packageKey, nodeKey, version, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(
            FileService.fileDownloadedMessage
        )[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            {encoding: "utf-8"}
        );

        const dependenciesTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as NodeDependencyTransport[];

        expect(dependenciesTransport).toEqual(dependencies);
    });

    it("Should handle empty dependencies list in console output", async () => {
        const emptyDependencies: NodeDependencyTransport[] = [];

        mockAxiosGet(
            `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/dependencies?version=${version}`,
            emptyDependencies
        );

        await new NodeDependencyService(testContext).listNodeDependencies(packageKey, nodeKey, version, false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message.trim()).toBe("No dependencies found for this node.");
    });

    it("Should handle empty dependencies list in JSON output", async () => {
        const emptyDependencies: NodeDependencyTransport[] = [];

        mockAxiosGet(
            `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/dependencies?version=${version}`,
            emptyDependencies
        );

        await new NodeDependencyService(testContext).listNodeDependencies(packageKey, nodeKey, version, true);

        const expectedFileName = loggingTestTransport.logMessages[0].message.split(
            FileService.fileDownloadedMessage
        )[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            expect.any(String),
            {encoding: "utf-8"}
        );

        const dependenciesTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as NodeDependencyTransport[];

        expect(dependenciesTransport).toEqual([]);
    });

    it("Should list single node dependency", async () => {
        const singleDependency: NodeDependencyTransport[] = [
            {
                packageKey: "single-dependency-package",
                key: "single-dependency-key",
                type: "KNOWLEDGE_MODEL",
            },
        ];

        mockAxiosGet(
            `https://myTeam.celonis.cloud/pacman/api/core/packages/${packageKey}/nodes/${nodeKey}/dependencies?version=${version}`,
            singleDependency
        );

        await new NodeDependencyService(testContext).listNodeDependencies(packageKey, nodeKey, version, false);

        expect(loggingTestTransport.logMessages.length).toBe(2);
        expect(loggingTestTransport.logMessages[0].message.trim()).toBe("Found 1 dependency:");
        expect(loggingTestTransport.logMessages[1].message).toContain(JSON.stringify(singleDependency[0]));
    });

    describe("Staging dependencies - when version is not provided", () => {
        it("Should list staging node dependencies and display in console", async () => {
            mockAxiosGet(
                `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}/dependencies`,
                dependencies
            );

            await new NodeDependencyService(testContext).listNodeDependencies(packageKey, nodeKey, null, false);

            expect(loggingTestTransport.logMessages.length).toBe(4);
            expect(loggingTestTransport.logMessages[0].message.trim()).toBe("Found 3 dependencies:");
            expect(loggingTestTransport.logMessages[1].message).toContain(JSON.stringify(dependencies[0]));
            expect(loggingTestTransport.logMessages[2].message).toContain(JSON.stringify(dependencies[1]));
            expect(loggingTestTransport.logMessages[3].message).toContain(JSON.stringify(dependencies[2]));
        });

        it("Should list staging node dependencies and return as JSON", async () => {
            mockAxiosGet(
                `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}/dependencies`,
                dependencies
            );

            await new NodeDependencyService(testContext).listNodeDependencies(packageKey, nodeKey, null, true);

            const expectedFileName = loggingTestTransport.logMessages[0].message.split(
                FileService.fileDownloadedMessage
            )[1];

            expect(mockWriteFileSync).toHaveBeenCalledWith(
                path.resolve(process.cwd(), expectedFileName),
                expect.any(String),
                {encoding: "utf-8"}
            );

            const dependenciesTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as NodeDependencyTransport[];

            expect(dependenciesTransport).toEqual(dependencies);
        });

        it("Should handle empty staging dependencies list in console output", async () => {
            const emptyDependencies: NodeDependencyTransport[] = [];

            mockAxiosGet(
                `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}/dependencies`,
                emptyDependencies
            );

            await new NodeDependencyService(testContext).listNodeDependencies(packageKey, nodeKey, null, false);

            expect(loggingTestTransport.logMessages.length).toBe(1);
            expect(loggingTestTransport.logMessages[0].message.trim()).toBe("No dependencies found for this node.");
        });

        it("Should handle empty staging dependencies list in JSON output", async () => {
            const emptyDependencies: NodeDependencyTransport[] = [];

            mockAxiosGet(
                `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}/dependencies`,
                emptyDependencies
            );

            await new NodeDependencyService(testContext).listNodeDependencies(packageKey, nodeKey, null, true);

            const expectedFileName = loggingTestTransport.logMessages[0].message.split(
                FileService.fileDownloadedMessage
            )[1];

            expect(mockWriteFileSync).toHaveBeenCalledWith(
                path.resolve(process.cwd(), expectedFileName),
                expect.any(String),
                {encoding: "utf-8"}
            );

            const dependenciesTransport = JSON.parse(mockWriteFileSync.mock.calls[0][1]) as NodeDependencyTransport[];

            expect(dependenciesTransport).toEqual([]);
        });

        it("Should list single staging node dependency", async () => {
            const singleDependency: NodeDependencyTransport[] = [
                {
                    packageKey: "staging-dependency-package",
                    key: "staging-dependency-key",
                    type: "ANALYSIS",
                },
            ];

            mockAxiosGet(
                `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}/dependencies`,
                singleDependency
            );

            await new NodeDependencyService(testContext).listNodeDependencies(packageKey, nodeKey, null, false);

            expect(loggingTestTransport.logMessages.length).toBe(2);
            expect(loggingTestTransport.logMessages[0].message.trim()).toBe("Found 1 dependency:");
            expect(loggingTestTransport.logMessages[1].message).toContain(JSON.stringify(singleDependency[0]));
        });

        it("Should handle undefined version (same as null)", async () => {
            mockAxiosGet(
                `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${packageKey}/nodes/${nodeKey}/dependencies`,
                dependencies
            );

            await new NodeDependencyService(testContext).listNodeDependencies(packageKey, nodeKey, undefined, false);

            expect(loggingTestTransport.logMessages.length).toBe(4);
            expect(loggingTestTransport.logMessages[0].message.trim()).toBe("Found 3 dependencies:");
        });
    });
});
