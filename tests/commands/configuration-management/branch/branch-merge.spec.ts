import { mockAxiosPost, mockedPostRequestBodyByUrl } from "../../../utls/http-requests-mock";
import { BranchCommandService } from "../../../../src/commands/configuration-management/branch/branch.command.service";
import { testContext } from "../../../utls/test-context";
import { loggingTestTransport } from "../../../jest.setup";
import { getJsonFromDownloadedFile, writeJsonTempFile } from "../../../utls/fs-utils";
import {
    ChangeType,
    MergeBranchTransport,
    MergePreviewTransport,
    MergeResolution,
    MergeStatus,
    PackageVersionCreatedTransport,
    VersionBumpOption,
} from "../../../../src/commands/configuration-management/branch/interfaces/branch.interfaces";

describe("branch merge preview", () => {
    const targetPackageKey = "my-package";
    const previewUrl = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${targetPackageKey}/merge/preview`;

    const preview: MergePreviewTransport = {
        commonPackageKey: targetPackageKey,
        commonVersion: "1.2.0",
        packageChanges: {
            sourceChange: ChangeType.UNCHANGED,
            targetChange: ChangeType.UNCHANGED,
            changeDate: new Date().toISOString(),
            updatedBy: "user",
            changes: {
                configuration: {
                    status: MergeStatus.UNCHANGED,
                    sourceChanges: [],
                    targetChanges: [],
                    conflicts: [],
                    autoMergedChanges: [],
                },
                metadata: {
                    status: MergeStatus.UNCHANGED,
                    sourceChanges: [],
                    targetChanges: [],
                    conflicts: [],
                    autoMergedChanges: [],
                },
            },
        },
        nodeChanges: [
            {
                nodeKey: "node-1",
                name: "Node 1",
                type: "VIEW",
                invalidContent: false,
                sourceChange: ChangeType.CHANGED,
                targetChange: ChangeType.UNCHANGED,
                changeDate: new Date().toISOString(),
                updatedBy: "user",
                changes: {
                    configuration: {
                        status: MergeStatus.CONFLICT,
                        sourceChanges: [],
                        targetChanges: [],
                        conflicts: [
                            { path: "/title", sourceChange: { op: "replace", path: "/title", value: "A" }, targetChange: { op: "replace", path: "/title", value: "B" } },
                        ],
                        autoMergedChanges: [],
                    },
                    metadata: {
                        status: MergeStatus.UNCHANGED,
                        sourceChanges: [],
                        targetChanges: [],
                        conflicts: [],
                        autoMergedChanges: [],
                    },
                },
            },
        ],
    };

    it("posts the source key/version and prints a summary with conflict count", async () => {
        mockAxiosPost(previewUrl, preview);

        await new BranchCommandService(testContext).mergePreview(
            targetPackageKey,
            `${targetPackageKey}@feature-a`,
            "1.4.0",
            false,
        );

        expect(JSON.parse(mockedPostRequestBodyByUrl.get(previewUrl) as string)).toEqual({
            sourceKey: `${targetPackageKey}@feature-a`,
            sourceVersion: "1.4.0",
        });
        const messages = loggingTestTransport.logMessages.map((m) => m.message);
        expect(messages.some((m) => m.includes("conflicting paths: 1"))).toBe(true);
    });

    it("writes raw transport to JSON when jsonResponse=true", async () => {
        mockAxiosPost(previewUrl, preview);

        await new BranchCommandService(testContext).mergePreview(targetPackageKey, "src", "1.4.0", true);

        expect(getJsonFromDownloadedFile()).toEqual(preview);
    });

    it("reports a structural conflict that has no conflicting paths", async () => {
        const structural: MergePreviewTransport = {
            ...preview,
            nodeChanges: [
                {
                    ...preview.nodeChanges[0],
                    nodeKey: "node-2",
                    sourceChange: ChangeType.DELETED,
                    targetChange: ChangeType.UNCHANGED,
                    changes: {
                        configuration: { status: MergeStatus.CONFLICT, sourceChanges: [], targetChanges: [], conflicts: [], autoMergedChanges: [] },
                        metadata: { status: MergeStatus.CONFLICT, sourceChanges: [], targetChanges: [], conflicts: [], autoMergedChanges: [] },
                    },
                },
            ],
        };
        mockAxiosPost(previewUrl, structural);

        await new BranchCommandService(testContext).mergePreview(targetPackageKey, `${targetPackageKey}@feature-a`, "1.4.0", false);

        const messages = loggingTestTransport.logMessages.map(m => m.message);
        expect(messages.some(m => m.includes("conflicting paths: 0, nodes needing resolution: 1"))).toBe(true);
        expect(messages.some(m => m.includes("The conflicts above are structural"))).toBe(true);
    });

    it("counts a node once even when both configuration and metadata conflict", async () => {
        mockAxiosPost(previewUrl, preview);

        await new BranchCommandService(testContext).mergePreview(targetPackageKey, `${targetPackageKey}@feature-a`, "1.4.0", false);

        const messages = loggingTestTransport.logMessages.map(m => m.message);
        expect(messages.some(m => m.includes("conflicting paths: 1, nodes needing resolution: 1"))).toBe(true);
        expect(messages.some(m => m.includes("The conflicts above are structural"))).toBe(false);
    });
});

describe("branch merge apply", () => {
    const targetPackageKey = "my-package";
    const mergeUrl = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${targetPackageKey}/merge`;
    const previewUrl = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${targetPackageKey}/merge/preview`;

    const created: PackageVersionCreatedTransport = {
        packageKey: targetPackageKey,
        version: "1.5.0",
        summaryOfChanges: "merge from feature-a",
        creationDate: new Date().toISOString(),
        createdBy: "user",
    };

    const baseBody: MergeBranchTransport = {
        sourceKey: `${targetPackageKey}@feature-a`,
        sourceVersion: "1.4.0",
        resolvedNodeConflicts: [
            { nodeKey: "node-1", resolution: MergeResolution.ACCEPT_SOURCE },
        ],
        versionCreate: { version: "9.9.9", summaryOfChanges: "merge from feature-a" },
    };

    beforeEach(() => {
        writeJsonTempFile("merge-request.json", baseBody);
    });

    it("merges using values from the body when flags are omitted", async () => {
        mockAxiosPost(mergeUrl, created);

        await new BranchCommandService(testContext).mergeApply(targetPackageKey, {
            file: "merge-request.json",
        });

        const sent: MergeBranchTransport = JSON.parse(mockedPostRequestBodyByUrl.get(mergeUrl) as string);
        expect(sent.sourceKey).toBe(baseBody.sourceKey);
        expect(sent.sourceVersion).toBe(baseBody.sourceVersion);
        expect(sent.resolvedNodeConflicts).toEqual(baseBody.resolvedNodeConflicts);
        expect(sent.versionCreate).toEqual(baseBody.versionCreate);
        expect(loggingTestTransport.logMessages.some((m) => m.message.includes(`Merge applied: published ${targetPackageKey}@1.5.0`))).toBe(true);
    });

    it("overrides source from flags when provided", async () => {
        mockAxiosPost(mergeUrl, created);

        await new BranchCommandService(testContext).mergeApply(targetPackageKey, {
            sourceKey: "override-key",
            sourceVersion: "LATEST",
            file: "merge-request.json",
        });

        const sent: MergeBranchTransport = JSON.parse(mockedPostRequestBodyByUrl.get(mergeUrl) as string);
        expect(sent.sourceKey).toBe("override-key");
        expect(sent.sourceVersion).toBe("LATEST");
    });

    it("flag --bump overrides versionCreate from the file and accepts lowercase", async () => {
        mockAxiosPost(mergeUrl, created);

        await new BranchCommandService(testContext).mergeApply(targetPackageKey, {
            file: "merge-request.json",
            bump: "patch",
        });

        const sent: MergeBranchTransport = JSON.parse(mockedPostRequestBodyByUrl.get(mergeUrl) as string);
        expect(sent.versionCreate.versionBumpOption).toBe(VersionBumpOption.PATCH);
        expect(sent.versionCreate.version).toBeUndefined();
    });

    it("flag --version overrides versionCreate.version and clears bump", async () => {
        mockAxiosPost(mergeUrl, created);

        await new BranchCommandService(testContext).mergeApply(targetPackageKey, {
            file: "merge-request.json",
            version: "2.0.0",
        });

        const sent: MergeBranchTransport = JSON.parse(mockedPostRequestBodyByUrl.get(mergeUrl) as string);
        expect(sent.versionCreate.version).toBe("2.0.0");
        expect(sent.versionCreate.versionBumpOption).toBeUndefined();
    });

    it("writes raw transport to JSON when jsonResponse=true", async () => {
        mockAxiosPost(mergeUrl, created);

        await new BranchCommandService(testContext).mergeApply(targetPackageKey, {
            file: "merge-request.json",
            jsonResponse: true,
        });

        expect(getJsonFromDownloadedFile()).toEqual(created);
    });

    describe("without a resolutions file", () => {
        it("posts to the merge endpoint directly with default versionCreate", async () => {
            mockAxiosPost(mergeUrl, created);

            await new BranchCommandService(testContext).mergeApply(targetPackageKey, {
                sourceKey: `${targetPackageKey}@feature-a`,
                sourceVersion: "1.4.0",
            });

            expect(mockedPostRequestBodyByUrl.get(previewUrl)).toBeUndefined();
            const sent: MergeBranchTransport = JSON.parse(mockedPostRequestBodyByUrl.get(mergeUrl) as string);
            expect(sent.sourceKey).toBe(`${targetPackageKey}@feature-a`);
            expect(sent.sourceVersion).toBe("1.4.0");
            expect(sent.resolvedNodeConflicts).toBeUndefined();
            expect(sent.versionCreate).toEqual({
                versionBumpOption: VersionBumpOption.PATCH,
                summaryOfChanges: `Merge ${targetPackageKey}@feature-a@1.4.0`,
            });
        });

        it("honours flags for bump and summary", async () => {
            mockAxiosPost(mergeUrl, created);

            await new BranchCommandService(testContext).mergeApply(targetPackageKey, {
                sourceKey: `${targetPackageKey}@feature-a`,
                sourceVersion: "1.4.0",
                bump: "PATCH",
                summary: "ship it",
            });

            const sent: MergeBranchTransport = JSON.parse(mockedPostRequestBodyByUrl.get(mergeUrl) as string);
            expect(sent.versionCreate).toEqual({
                versionBumpOption: VersionBumpOption.PATCH,
                summaryOfChanges: "ship it",
            });
        });
    });

});
