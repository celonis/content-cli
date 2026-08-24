import { classifyWorkspaceChanges } from "../../../src/commands/workspace/workspace-change-classifier";
import { ExpectedWorkspaceFile } from "../../../src/commands/workspace/workspace.models";

function tracked(nodeKey: string, filePath: string, digest?: string): ExpectedWorkspaceFile {
    return { nodeKey, path: filePath, assetType: "md", digest };
}

describe("Workspace change classifier", () => {
    it("keeps unchanged files clean", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Guides/Guide.md", "sha256:one")],
                new Map([["Guides/Guide.md", "sha256:one"]]),
                {}
            )
        ).toEqual([]);
    });

    it("infers a uniquely matching unchanged move", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Guides/Guide.md", "sha256:one")],
                new Map([["Pages/Guide.md", "sha256:one"]]),
                {}
            )
        ).toEqual([{ nodeKey: "node-1", path: "Pages/Guide.md", status: "moved" }]);
    });

    it("keeps a uniquely matching filename rename unresolved", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Guides/Guide.md", "sha256:one")],
                new Map([["Pages/Renamed.md", "sha256:one"]]),
                {}
            )
        ).toEqual([{ nodeKey: "node-1", path: "Pages/Renamed.md", status: "unresolved" }]);
    });

    it("uses a recorded hint for a move followed by an edit", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Guides/Guide.md", "sha256:one")],
                new Map([["Pages/Guide.md", "sha256:two"]]),
                { "node-1": "Pages/Guide.md" }
            )
        ).toEqual([{ nodeKey: "node-1", path: "Pages/Guide.md", status: "moved, modified" }]);
    });

    it("uses a reconciliation hint when metadata already names the destination", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Pages/Guide.md", "sha256:one")],
                new Map([["Pages/Guide.md", "sha256:one"]]),
                { "node-1": "Pages/Guide.md" }
            )
        ).toEqual([{ nodeKey: "node-1", path: "Pages/Guide.md", status: "moved" }]);
    });

    it("keeps a recorded case-only filename rename unresolved", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Guides/Guide.md", "sha256:one")],
                new Map([["Guides/Guide.md", "sha256:one"]]),
                { "node-1": "Guides/guide.md" }
            )
        ).toEqual([{ nodeKey: "node-1", path: "Guides/guide.md", status: "unresolved" }]);
    });

    it("keeps a distinct deletion and addition separate", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Guides/Old.md", "sha256:one")],
                new Map([["Pages/New.md", "sha256:two"]]),
                {}
            )
        ).toEqual([
            { nodeKey: "node-1", path: "Guides/Old.md", status: "deleted" },
            { path: "Pages/New.md", status: "added" },
        ]);
    });

    it("keeps ambiguous moved and edited basenames unresolved", () => {
        expect(
            classifyWorkspaceChanges(
                [
                    tracked("node-1", "Guides/Guide.md", "sha256:one"),
                    tracked("node-2", "Tutorials/Guide.md", "sha256:two"),
                ],
                new Map([["Pages/Guide.md", "sha256:three"]]),
                {}
            )
        ).toEqual([
            { nodeKey: "node-1", path: "Guides/Guide.md", status: "unresolved" },
            { path: "Pages/Guide.md", status: "unresolved" },
            { nodeKey: "node-2", path: "Tutorials/Guide.md", status: "unresolved" },
        ]);
    });

    it("classifies a metadata-backed file without a baseline as added", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Guides/New.md")],
                new Map([["Guides/New.md", "sha256:new"]]),
                {}
            )
        ).toEqual([{ nodeKey: "node-1", path: "Guides/New.md", status: "added" }]);
    });

    it("keeps an unrecorded move without a baseline unresolved once", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Guides/New.md")],
                new Map([["Pages/New.md", "sha256:new"]]),
                {}
            )
        ).toEqual([{ nodeKey: "node-1", path: "Pages/New.md", status: "unresolved" }]);
    });

    it("classifies a recorded move without a baseline as added", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Guides/New.md")],
                new Map([["Pages/New.md", "sha256:new"]]),
                { "node-1": "Pages/New.md" }
            )
        ).toEqual([{ nodeKey: "node-1", path: "Pages/New.md", status: "added" }]);
    });

    it("keeps an invalid recorded move unresolved", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Guides/Guide.md", "sha256:one")],
                new Map([["Guides/Guide.md", "sha256:one"]]),
                { "node-1": "Pages/Guide.md" }
            )
        ).toEqual([{ nodeKey: "node-1", path: "Pages/Guide.md", status: "unresolved" }]);
    });

    it("keeps an unrecorded same-name move and edit unresolved", () => {
        expect(
            classifyWorkspaceChanges(
                [tracked("node-1", "Guides/Guide.md", "sha256:one")],
                new Map([["Pages/Guide.md", "sha256:two"]]),
                {}
            )
        ).toEqual([{ nodeKey: "node-1", path: "Pages/Guide.md", status: "unresolved" }]);
    });
});
