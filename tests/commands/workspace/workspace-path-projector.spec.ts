import { createHash } from "node:crypto";
import {
    projectedLeafAfterMove,
    projectWorkspacePaths,
} from "../../../src/commands/workspace/workspace-path-projector";
import { WorkspaceNodeMetadata } from "../../../src/commands/workspace/workspace.models";

describe("Workspace path projector", () => {
    it("derives registered and fallback extensions from Asset Type", () => {
        const nodes: WorkspaceNodeMetadata[] = [
            { key: "folder", name: "Guides", type: "FOLDER" },
            { key: "markdown", name: "Guide", type: "MARKDOWN_FILE", parentNodeKey: "folder" },
            { key: "html", name: "Landing", type: "HTML_CANVAS" },
            { key: "board", name: "Metrics", type: "BOARD_V2" },
        ];

        expect(Object.fromEntries(projectWorkspacePaths(nodes))).toEqual({
            folder: "Guides",
            markdown: "Guides/Guide.md",
            html: "Landing.html",
            board: "Metrics.json",
        });
    });

    it("adds stable Node-key suffixes to every colliding sibling", () => {
        const nodes: WorkspaceNodeMetadata[] = [
            { key: "folder", name: "Guides", type: "FOLDER" },
            { key: "node-1", name: "Guide", type: "MARKDOWN_FILE", parentNodeKey: "folder" },
            { key: "node-2", name: "Guide", type: "MARKDOWN_FILE", parentNodeKey: "folder" },
        ];

        const paths = projectWorkspacePaths(nodes);

        expect(paths.get("node-1")).toBe(`Guides/Guide~${shortHash("node-1")}.md`);
        expect(paths.get("node-2")).toBe(`Guides/Guide~${shortHash("node-2")}.md`);
    });

    it("projects the leaf against target siblings before a parent move", () => {
        const nodes: WorkspaceNodeMetadata[] = [
            { key: "guides", name: "Guides", type: "FOLDER" },
            { key: "pages", name: "Pages", type: "FOLDER" },
            { key: "source", name: "Guide", type: "MARKDOWN_FILE", parentNodeKey: "guides" },
            { key: "target", name: "Guide", type: "MARKDOWN_FILE", parentNodeKey: "pages" },
        ];

        expect(projectedLeafAfterMove(nodes, "source", "pages")).toBe(`Guide~${shortHash("source")}.md`);
        expect(projectedLeafAfterMove(nodes, "source", "new-parent")).toBe("Guide.md");
    });
});

function shortHash(value: string): string {
    return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
