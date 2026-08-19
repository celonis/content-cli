import { classifyWorkspaceChanges } from "../../../src/commands/workspace/workspace-change-classifier";

describe("Workspace change classifier", () => {
    it("keeps unchanged files clean", () => {
        expect(
            classifyWorkspaceChanges(
                [{ nodeKey: "node-1", path: "Guides/Guide.md", digest: "sha256:one" }],
                new Map([["Guides/Guide.md", "sha256:one"]]),
                {}
            )
        ).toEqual([]);
    });

    it("infers a uniquely matching unchanged move", () => {
        expect(
            classifyWorkspaceChanges(
                [{ nodeKey: "node-1", path: "Guides/Guide.md", digest: "sha256:one" }],
                new Map([["Pages/Guide.md", "sha256:one"]]),
                {}
            )
        ).toEqual([{ nodeKey: "node-1", path: "Pages/Guide.md", status: "moved" }]);
    });

    it("uses a recorded hint for a move followed by an edit", () => {
        expect(
            classifyWorkspaceChanges(
                [{ nodeKey: "node-1", path: "Guides/Guide.md", digest: "sha256:one" }],
                new Map([["Pages/Guide.md", "sha256:two"]]),
                { "node-1": "Pages/Guide.md" }
            )
        ).toEqual([{ nodeKey: "node-1", path: "Pages/Guide.md", status: "moved, modified" }]);
    });
});
