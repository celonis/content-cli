import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import AdmZip = require("adm-zip");
import { WorkspaceService } from "../../../src/commands/workspace/workspace.service";
import { testContext } from "../../utls/test-context";
import { mockAxiosGet, mockAxiosPost, mockedAxiosInstance } from "../../utls/http-requests-mock";

const PACKAGE_KEY = "pkg-1";
const CHECKOUT_URL = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/file-archive`;
const PUSH_URL = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/file-archive`;

interface TestFile {
    nodeKey: string;
    path: string;
    content: string;
}

function digest(value: string): string {
    return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function metadata(files: TestFile[]): Record<string, object> {
    const nodes: Record<string, object> = {};
    const folders = new Map<string, string>();
    files.forEach(file => {
        const segments = file.path.split("/");
        let parentNodeKey: string | null = null;
        for (let index = 0; index < segments.length - 1; index += 1) {
            const folderPath = segments.slice(0, index + 1).join("/");
            let folderKey = folders.get(folderPath);
            if (!folderKey) {
                folderKey = `folder-${folders.size + 1}`;
                folders.set(folderPath, folderKey);
                nodes[folderKey] = {
                    key: folderKey,
                    name: segments[index],
                    type: "FOLDER",
                    parentNodeKey,
                    filesystemName: segments[index],
                };
            }
            parentNodeKey = folderKey;
        }
        nodes[file.nodeKey] = {
            key: file.nodeKey,
            name: path.posix.basename(file.path, path.posix.extname(file.path)),
            type: "MARKDOWN_FILE",
            parentNodeKey,
            filesystemName: segments[segments.length - 1],
        };
    });
    return nodes;
}

function state(
    files: TestFile[],
    serverRevision: string = "revision-1",
    moveHints: Record<string, string> = {}
): object {
    return {
        schemaVersion: 1,
        packageKey: PACKAGE_KEY,
        serverRevision: digest(serverRevision),
        baselineDigests: Object.fromEntries(files.map(file => [file.nodeKey, digest(file.content)])),
        moveHints,
    };
}

function archive(files: TestFile[], serverRevision?: string, moveHints?: Record<string, string>): Buffer {
    const zip = new AdmZip();
    zip.addFile(".pacman/state.json", Buffer.from(JSON.stringify(state(files, serverRevision, moveHints))));
    Object.entries(metadata(files)).forEach(([nodeKey, node]) => {
        zip.addFile(`.pacman/nodes/${nodeKey}.json`, Buffer.from(JSON.stringify(node)));
    });
    files.forEach(file => zip.addFile(file.path, Buffer.from(file.content)));
    return zip.toBuffer();
}

function writeWorkspace(files: TestFile[] = [{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]): void {
    fs.mkdirSync(path.join(process.cwd(), ".pacman", "nodes"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), ".pacman", "state.json"), JSON.stringify(state(files)));
    Object.entries(metadata(files)).forEach(([nodeKey, node]) => {
        fs.writeFileSync(path.join(process.cwd(), ".pacman", "nodes", `${nodeKey}.json`), JSON.stringify(node));
    });
    files.forEach(file => {
        fs.mkdirSync(path.dirname(path.join(process.cwd(), file.path)), { recursive: true });
        fs.writeFileSync(path.join(process.cwd(), file.path), file.content);
    });
}

function removeWorkspace(): void {
    [".pacman", "Guides", "Pages", "Other", "New", PACKAGE_KEY].forEach(entry =>
        fs.rmSync(path.join(process.cwd(), entry), { recursive: true, force: true })
    );
}

describe("Workspace service", () => {
    beforeEach(removeWorkspace);
    afterEach(removeWorkspace);

    it("checks out and validates a filesystem archive", async () => {
        mockAxiosGet(
            CHECKOUT_URL,
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }])
        );
        const rename = jest.spyOn(fs, "renameSync");

        try {
            await new WorkspaceService(testContext).checkout(PACKAGE_KEY);

            expect(fs.readFileSync(path.join(process.cwd(), PACKAGE_KEY, "Guides", "Guide.md"), "utf-8")).toBe(
                "original"
            );
            const checkoutRename = rename.mock.calls.find(call => call[1] === path.join(process.cwd(), PACKAGE_KEY));
            expect(checkoutRename).toBeDefined();
            expect(path.dirname(checkoutRename![0].toString())).toBe(path.dirname(checkoutRename![1].toString()));
        } finally {
            rename.mockRestore();
        }
    });

    it("infers an unchanged move performed by another tool without writing path state", () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides", "Guide.md"), path.join(process.cwd(), "Pages", "Guide.md"));

        expect(new WorkspaceService(testContext).status()).toEqual([{ path: "Pages/Guide.md", status: "moved" }]);
        const workspaceState = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "state.json"), "utf-8"));
        expect(workspaceState).not.toHaveProperty("files");
        expect(workspaceState).not.toHaveProperty("basePath");
        expect(workspaceState).not.toHaveProperty("currentPath");
        expect(workspaceState.moveHints).toEqual({});
    });

    it("requires an exceptional hint for a move followed by an edit", () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides", "Guide.md"), path.join(process.cwd(), "Pages", "Guide.md"));
        fs.writeFileSync(path.join(process.cwd(), "Pages", "Guide.md"), "changed");
        const service = new WorkspaceService(testContext);

        expect(service.status()).toEqual([{ path: "Pages/Guide.md", status: "unresolved" }]);

        service.move("Guides/Guide.md", "Pages/Guide.md", true);

        expect(service.status()).toEqual([{ path: "Pages/Guide.md", status: "moved, modified" }]);
        expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "state.json"), "utf-8"))).toMatchObject({
            moveHints: { "node-1": "Pages/Guide.md" },
        });
    });

    it("reports duplicate digest move candidates as unresolved", () => {
        writeWorkspace([
            { nodeKey: "node-1", path: "Guides/One.md", content: "same" },
            { nodeKey: "node-2", path: "Guides/Two.md", content: "same" },
        ]);
        fs.mkdirSync(path.join(process.cwd(), "New"));
        fs.renameSync(path.join(process.cwd(), "Guides", "One.md"), path.join(process.cwd(), "New", "Alpha.md"));
        fs.renameSync(path.join(process.cwd(), "Guides", "Two.md"), path.join(process.cwd(), "New", "Beta.md"));

        const changes = new WorkspaceService(testContext).status();

        expect(changes).toHaveLength(4);
        expect(changes.every(change => change.status === "unresolved")).toBe(true);
    });

    it("reports clean, modified, added, and deleted files", () => {
        writeWorkspace();
        const service = new WorkspaceService(testContext);
        expect(service.status()).toEqual([]);

        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "changed");
        expect(service.status()).toEqual([{ path: "Guides/Guide.md", status: "modified" }]);

        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "original");
        fs.writeFileSync(path.join(process.cwd(), "Other.md"), "new");
        expect(service.status()).toEqual([{ path: "Other.md", status: "added" }]);

        fs.rmSync(path.join(process.cwd(), "Other.md"));
        fs.rmSync(path.join(process.cwd(), "Guides", "Guide.md"));
        expect(service.status()).toEqual([{ path: "Guides/Guide.md", status: "deleted" }]);
    });

    it("moves a tracked file without maintaining a path index", () => {
        writeWorkspace();
        const service = new WorkspaceService(testContext);

        service.move("Guides/Guide.md", "Pages/Guide.md");

        expect(service.status()).toEqual([{ path: "Pages/Guide.md", status: "moved" }]);
        expect(fs.existsSync(path.join(process.cwd(), "Pages", "Guide.md"))).toBe(true);
    });

    it("rejects a move onto another metadata-derived path", () => {
        writeWorkspace([
            { nodeKey: "node-1", path: "Guides/Guide.md", content: "original" },
            { nodeKey: "node-2", path: "Pages/Guide.md", content: "other" },
        ]);

        expect(() => new WorkspaceService(testContext).move("Guides/Guide.md", "Pages/Guide.md")).toThrow(
            "Target path is already tracked"
        );
        expect(fs.existsSync(path.join(process.cwd(), "Guides", "Guide.md"))).toBe(true);
    });

    it("rejects circular node metadata", () => {
        writeWorkspace();
        const folderPath = path.join(process.cwd(), ".pacman", "nodes", "folder-1.json");
        const folder = JSON.parse(fs.readFileSync(folderPath, "utf-8"));
        folder.parentNodeKey = "folder-1";
        fs.writeFileSync(folderPath, JSON.stringify(folder));

        expect(() => new WorkspaceService(testContext).status()).toThrow("Circular node hierarchy");
    });

    it("rejects duplicate case-insensitive paths derived from node metadata", () => {
        writeWorkspace([
            { nodeKey: "node-1", path: "Guides/One.md", content: "one" },
            { nodeKey: "node-2", path: "Guides/Two.md", content: "two" },
        ]);
        const secondPath = path.join(process.cwd(), ".pacman", "nodes", "node-2.json");
        const second = JSON.parse(fs.readFileSync(secondPath, "utf-8"));
        second.filesystemName = "one.md";
        fs.writeFileSync(secondPath, JSON.stringify(second));

        expect(() => new WorkspaceService(testContext).status()).toThrow("Duplicate workspace path");
    });

    it("rejects duplicate case-insensitive paths in the visible tree", () => {
        writeWorkspace();
        const originalReaddir = fs.readdirSync;
        const fileEntry = (name: string) => ({
            name,
            isSymbolicLink: () => false,
            isDirectory: () => false,
            isFile: () => true,
        });
        const readdir = jest.spyOn(fs, "readdirSync").mockImplementation(((directory: fs.PathLike, options?: object) => {
            if (path.resolve(directory.toString()) === process.cwd()) {
                return [fileEntry("Visible.md"), fileEntry("visible.md")];
            }
            return originalReaddir(directory, options as never);
        }) as never);
        const service = new WorkspaceService(testContext);
        const digestingService = service as unknown as { digest(file: string): string };
        jest.spyOn(digestingService, "digest").mockReturnValue(digest("visible"));

        try {
            expect(() => service.status()).toThrow("duplicate case-insensitive paths");
        } finally {
            readdir.mockRestore();
        }
    });

    it("supports a case-only move when the target resolves to the source file", () => {
        writeWorkspace();
        const source = path.join(process.cwd(), "Guides", "Guide.md");
        const target = path.join(process.cwd(), "Guides", "guide.md");
        const existsSync = fs.existsSync;
        const lstatSync = fs.lstatSync;
        const exists = jest.spyOn(fs, "existsSync").mockImplementation(candidate => {
            return candidate.toString() === target || existsSync(candidate);
        });
        const lstat = jest.spyOn(fs, "lstatSync").mockImplementation(candidate => {
            return candidate.toString() === target ? lstatSync(source) : lstatSync(candidate);
        });

        try {
            new WorkspaceService(testContext).move("Guides/Guide.md", "Guides/guide.md");
            expect(fs.renameSync).toBeDefined();
        } finally {
            lstat.mockRestore();
            exists.mockRestore();
        }
    });

    it("rejects checkout over an existing destination", async () => {
        fs.mkdirSync(path.join(process.cwd(), PACKAGE_KEY));

        await expect(new WorkspaceService(testContext).checkout(PACKAGE_KEY)).rejects.toThrow(
            "Destination already exists"
        );
    });

    it("rejects an archive without workspace state", async () => {
        const zip = new AdmZip();
        zip.addFile("Guides/Guide.md", Buffer.from("original"));
        mockAxiosGet(CHECKOUT_URL, zip.toBuffer());

        await expect(new WorkspaceService(testContext).checkout(PACKAGE_KEY)).rejects.toThrow(
            "Archive does not contain .pacman/state.json"
        );
    });

    it("pushes resolved changes and refreshes disposable metadata", async () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides", "Guide.md"), path.join(process.cwd(), "Pages", "Guide.md"));
        fs.writeFileSync(path.join(process.cwd(), "Pages", "Guide.md"), "changed");
        const service = new WorkspaceService(testContext);
        service.move("Guides/Guide.md", "Pages/Guide.md", true);
        mockAxiosPost(PUSH_URL, {});
        mockAxiosGet(
            CHECKOUT_URL,
            archive([{ nodeKey: "node-1", path: "Pages/Guide.md", content: "changed" }], "revision-2")
        );

        await service.push(undefined, true);

        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
            PUSH_URL,
            expect.anything(),
            expect.objectContaining({ params: { overwrite: true } })
        );
        expect(service.status()).toEqual([]);
        expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "state.json"), "utf-8"))).toEqual({
            schemaVersion: 1,
            packageKey: PACKAGE_KEY,
            serverRevision: digest("revision-2"),
            baselineDigests: { "node-1": digest("changed") },
            moveHints: {},
        });
    });

    it("does not push unresolved file identities", async () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides", "Guide.md"), path.join(process.cwd(), "Pages", "Guide.md"));
        fs.writeFileSync(path.join(process.cwd(), "Pages", "Guide.md"), "changed");

        await expect(new WorkspaceService(testContext).push()).rejects.toThrow("Workspace has unresolved file identities");
        expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
    });

    it("reserves the metadata directory case-insensitively", () => {
        writeWorkspace();

        expect(() => new WorkspaceService(testContext).move("Guides/Guide.md", ".PACMAN/Guide.md")).toThrow(
            "Invalid workspace path"
        );
    });
});
