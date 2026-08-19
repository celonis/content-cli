import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import AdmZip = require("adm-zip");
import { WorkspaceService } from "../../../src/commands/workspace/workspace.service";
import { fileService } from "../../../src/core/utils/file-service";
import { testContext } from "../../utls/test-context";
import { mockAxiosGet, mockAxiosGetError, mockAxiosPost, mockedAxiosInstance } from "../../utls/http-requests-mock";

const PACKAGE_KEY = "pkg-1";
const ARCHIVE_URL = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/file-archive`;
const PUSH_URL = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/file-archive`;

interface TestFile {
    nodeKey: string;
    path: string;
    content: string;
}

function digest(value: string): string {
    return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function eTag(value: string): string {
    return `"${digest(value)}"`;
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
    serverRevision: string = eTag("revision-1"),
    moveHints: Record<string, string> = {}
): object {
    return {
        schemaVersion: 1,
        serverRevision,
        baselineDigests: Object.fromEntries(files.map(file => [file.nodeKey, digest(file.content)])),
        moveHints,
    };
}

function archive(files: TestFile[]): Buffer {
    const zip = new AdmZip();
    zip.addFile(".pacman/.gitignore", Buffer.from("local/\n"));
    zip.addFile(".pacman/package.json", Buffer.from(JSON.stringify({ schemaVersion: 1, packageKey: PACKAGE_KEY })));
    Object.entries(metadata(files)).forEach(([nodeKey, node]) => {
        zip.addFile(`.pacman/nodes/${nodeKey}.json`, Buffer.from(JSON.stringify(node)));
    });
    files.forEach(file => zip.addFile(file.path, Buffer.from(file.content)));
    return zip.toBuffer();
}

function writeWorkspace(files: TestFile[] = [{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]): void {
    fs.mkdirSync(path.join(process.cwd(), ".pacman", "nodes"), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), ".pacman", "local"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), ".pacman", ".gitignore"), "local/\n");
    fs.writeFileSync(
        path.join(process.cwd(), ".pacman", "package.json"),
        JSON.stringify({ schemaVersion: 1, packageKey: PACKAGE_KEY })
    );
    fs.writeFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), JSON.stringify(state(files)));
    Object.entries(metadata(files)).forEach(([nodeKey, node]) => {
        fs.writeFileSync(path.join(process.cwd(), ".pacman", "nodes", `${nodeKey}.json`), JSON.stringify(node));
    });
    files.forEach(file => {
        fs.mkdirSync(path.dirname(path.join(process.cwd(), file.path)), { recursive: true });
        fs.writeFileSync(path.join(process.cwd(), file.path), file.content);
    });
}

function removeWorkspace(): void {
    [".git", ".pacman", "Guides", "Pages", "Other", "New", PACKAGE_KEY].forEach(entry =>
        fs.rmSync(path.join(process.cwd(), entry), { recursive: true, force: true })
    );
}

describe("Workspace service", () => {
    beforeEach(removeWorkspace);
    afterEach(removeWorkspace);

    it("clones and validates a filesystem archive", async () => {
        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]),
            { etag: eTag("revision-1") }
        );
        const rename = jest.spyOn(fs, "renameSync");

        try {
            await new WorkspaceService(testContext).clone(PACKAGE_KEY);

            expect(fs.readFileSync(path.join(process.cwd(), PACKAGE_KEY, "Guides", "Guide.md"), "utf-8")).toBe(
                "original"
            );
            expect(fs.readFileSync(path.join(process.cwd(), PACKAGE_KEY, ".pacman", ".gitignore"), "utf-8")).toBe(
                "local/\n"
            );
            expect(
                JSON.parse(
                    fs.readFileSync(path.join(process.cwd(), PACKAGE_KEY, ".pacman", "local", "state.json"), "utf-8")
                )
            ).toEqual({
                schemaVersion: 1,
                serverRevision: eTag("revision-1"),
                baselineDigests: { "node-1": digest("original") },
                moveHints: {},
            });
            const cloneRename = rename.mock.calls.find(call => call[1] === path.join(process.cwd(), PACKAGE_KEY));
            expect(cloneRename).toBeDefined();
            expect(path.dirname(cloneRename![0].toString())).toBe(path.dirname(cloneRename![1].toString()));
        } finally {
            rename.mockRestore();
        }
    });

    it("rejects a clone response without an ETag", async () => {
        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }])
        );

        await expect(new WorkspaceService(testContext).clone(PACKAGE_KEY)).rejects.toThrow(
            "Filesystem archive response does not contain an ETag."
        );
    });

    it("pulls the latest archive into a clean existing workspace", async () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), ".git"));
        fs.writeFileSync(path.join(process.cwd(), ".git", "marker"), "keep");
        const workspaceInode = fs.statSync(process.cwd()).ino;
        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "remote" }]),
            { etag: eTag("revision-2") }
        );

        await new WorkspaceService(testContext).pull();

        expect(fs.statSync(process.cwd()).ino).toBe(workspaceInode);
        expect(fs.readFileSync(path.join(process.cwd(), ".git", "marker"), "utf-8")).toBe("keep");
        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("remote");
        expect(new WorkspaceService(testContext).status()).toEqual([]);
        expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))).toMatchObject({
            serverRevision: eTag("revision-2"),
            baselineDigests: { "node-1": digest("remote") },
            moveHints: {},
        });
    });

    it("hydrates local state after an external Git restore without overwriting files", async () => {
        writeWorkspace();
        fs.rmSync(path.join(process.cwd(), ".pacman", "local"), { recursive: true });
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "git change");
        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "remote" }]),
            { etag: eTag("revision-2") }
        );

        await new WorkspaceService(testContext).pull();

        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("git change");
        expect(new WorkspaceService(testContext).status()).toEqual([
            { path: "Guides/Guide.md", status: "modified" },
        ]);
        expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))).toMatchObject({
            serverRevision: eTag("revision-2"),
            baselineDigests: { "node-1": digest("remote") },
        });
    });

    it("hydrates a Git-restored workspace with CRLF metadata ignore rules", async () => {
        writeWorkspace();
        fs.rmSync(path.join(process.cwd(), ".pacman", "local"), { recursive: true });
        fs.writeFileSync(path.join(process.cwd(), ".pacman", ".gitignore"), "local/\r\n");
        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]),
            { etag: eTag("revision-2") }
        );

        const service = new WorkspaceService(testContext);
        await service.pull();

        expect(service.status()).toEqual([]);
    });

    it("keeps Git-restored path drift as a move for the next push", async () => {
        writeWorkspace([{ nodeKey: "node-1", path: "Pages/Guide.md", content: "original" }]);
        fs.rmSync(path.join(process.cwd(), ".pacman", "local"), { recursive: true });
        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]),
            { etag: eTag("revision-2") }
        );
        const service = new WorkspaceService(testContext);

        await service.pull();

        expect(service.status()).toEqual([{ path: "Pages/Guide.md", status: "moved" }]);
        expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))).toMatchObject({
            moveHints: { "node-1": "Pages/Guide.md" },
        });

        mockAxiosPost(PUSH_URL, {});
        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Pages/Guide.md", content: "original" }]),
            { etag: eTag("revision-3") }
        );
        await service.push();

        const form = (mockedAxiosInstance.post as jest.Mock).mock.calls[0][1] as { _streams: unknown[] };
        expect(form._streams).toContain(JSON.stringify({ moves: { "node-1": "Pages/Guide.md" } }));
        expect(service.status()).toEqual([]);
    });

    it("refuses to pull over local changes", async () => {
        writeWorkspace();
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "local");

        await expect(new WorkspaceService(testContext).pull()).rejects.toThrow("Workspace has local changes");
        expect(mockedAxiosInstance.get).not.toHaveBeenCalled();
        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("local");
    });

    it("restores the existing workspace when applying a pull fails", async () => {
        writeWorkspace();
        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "remote" }]),
            { etag: eTag("revision-2") }
        );
        const originalRename = fs.renameSync;
        const rename = jest.spyOn(fs, "renameSync").mockImplementation((source, target) => {
            const sourceParent = path.basename(path.dirname(source.toString()));
            if (sourceParent.startsWith(".pacman-pull-") && !sourceParent.startsWith(".pacman-pull-backup-")) {
                throw new Error("apply failed");
            }
            originalRename(source, target);
        });

        try {
            await expect(new WorkspaceService(testContext).pull()).rejects.toThrow("apply failed");
        } finally {
            rename.mockRestore();
        }
        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("original");
        expect(new WorkspaceService(testContext).status()).toEqual([]);
    });

    it("preserves the workspace backup when pull and rollback both fail", async () => {
        writeWorkspace();
        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "remote" }]),
            { etag: eTag("revision-2") }
        );
        const originalRename = fs.renameSync;
        const rename = jest.spyOn(fs, "renameSync").mockImplementation((source, target) => {
            const sourceParent = path.basename(path.dirname(source.toString()));
            if (sourceParent.startsWith(".pacman-pull-")) {
                throw new Error("rename failed");
            }
            originalRename(source, target);
        });
        let backup: string | undefined;

        try {
            await new WorkspaceService(testContext).pull();
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            const match = (error as Error).message.match(/backup remains at (.+)\.$/);
            backup = match?.[1];
        } finally {
            rename.mockRestore();
        }

        expect(backup).toBeDefined();
        expect(fs.existsSync(backup!)).toBe(true);
        fs.readdirSync(backup!).forEach(entry => {
            originalRename(path.join(backup!, entry), path.join(process.cwd(), entry));
        });
        fs.rmSync(backup!, { recursive: true, force: true });
        expect(new WorkspaceService(testContext).status()).toEqual([]);
    });

    it("infers an unchanged move performed by another tool without writing path state", () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides", "Guide.md"), path.join(process.cwd(), "Pages", "Guide.md"));

        expect(new WorkspaceService(testContext).status()).toEqual([{ path: "Pages/Guide.md", status: "moved" }]);
        const workspaceState = JSON.parse(
            fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8")
        );
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
        expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))).toMatchObject({
            moveHints: { "node-1": "Pages/Guide.md" },
        });
    });

    it("records a move when the source casing differs from metadata", () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(
            path.join(process.cwd(), "Guides", "Guide.md"),
            path.join(process.cwd(), "Pages", "Guide.md")
        );
        const service = new WorkspaceService(testContext);

        service.move("guides/guide.md", "Pages/Guide.md", true);

        expect(service.status()).toEqual([{ path: "Pages/Guide.md", status: "moved" }]);
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toMatchObject({ moveHints: { "node-1": "Pages/Guide.md" } });
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

    it("records an explicit move after the source was edited", () => {
        writeWorkspace();
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "changed");
        const service = new WorkspaceService(testContext);

        service.move("Guides/Guide.md", "Pages/Guide.md");

        expect(service.status()).toEqual([{ path: "Pages/Guide.md", status: "moved, modified" }]);
        expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))).toMatchObject({
            moveHints: { "node-1": "Pages/Guide.md" },
        });
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

    it("rejects a move for an untracked source", () => {
        writeWorkspace();

        expect(() => new WorkspaceService(testContext).move("Other.md", "Pages/Other.md")).toThrow(
            "Tracked file not found"
        );
    });

    it("rejects a recorded move when the target is missing", () => {
        writeWorkspace();

        expect(() =>
            new WorkspaceService(testContext).move("Guides/Guide.md", "Pages/Guide.md", true)
        ).toThrow("Moved file not found");
    });

    it("rejects a missing source and an existing untracked target", () => {
        writeWorkspace();
        const source = path.join(process.cwd(), "Guides", "Guide.md");
        const target = path.join(process.cwd(), "Pages", "Guide.md");
        fs.rmSync(source);

        expect(() => new WorkspaceService(testContext).move("Guides/Guide.md", "Pages/Guide.md")).toThrow(
            "Tracked file not found"
        );

        fs.mkdirSync(path.dirname(target));
        fs.writeFileSync(source, "original");
        fs.writeFileSync(target, "other");
        expect(() => new WorkspaceService(testContext).move("Guides/Guide.md", "Pages/Guide.md")).toThrow(
            "Target already exists"
        );
    });

    it("rejects circular node metadata", () => {
        writeWorkspace();
        const folderPath = path.join(process.cwd(), ".pacman", "nodes", "folder-1.json");
        const folder = JSON.parse(fs.readFileSync(folderPath, "utf-8"));
        folder.parentNodeKey = "folder-1";
        fs.writeFileSync(folderPath, JSON.stringify(folder));

        expect(() => new WorkspaceService(testContext).status()).toThrow("Circular node hierarchy");
    });

    it("rejects volatile fields in stable node metadata", () => {
        writeWorkspace();
        const nodePath = path.join(process.cwd(), ".pacman", "nodes", "node-1.json");
        const node = JSON.parse(fs.readFileSync(nodePath, "utf-8"));
        node.changeDate = "2026-08-19T12:00:00Z";
        fs.writeFileSync(nodePath, JSON.stringify(node));

        expect(() => new WorkspaceService(testContext).status()).toThrow("Invalid node metadata file");
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
            const service = new WorkspaceService(testContext);
            service.move("Guides/Guide.md", "Guides/guide.md");
            expect(service.status()).toEqual([{ path: "Guides/guide.md", status: "moved" }]);
        } finally {
            lstat.mockRestore();
            exists.mockRestore();
        }
    });

    it("rejects clone over an existing destination", async () => {
        fs.mkdirSync(path.join(process.cwd(), PACKAGE_KEY));

        await expect(new WorkspaceService(testContext).clone(PACKAGE_KEY)).rejects.toThrow(
            "Destination already exists"
        );
    });

    it("rejects an archive without stable package metadata", async () => {
        const zip = new AdmZip();
        zip.addFile("Guides/Guide.md", Buffer.from("original"));
        mockAxiosGet(ARCHIVE_URL, zip.toBuffer(), { etag: eTag("revision-1") });

        await expect(new WorkspaceService(testContext).clone(PACKAGE_KEY)).rejects.toThrow(
            "Archive does not contain Pacman package metadata"
        );
    });

    it("rejects downloaded archives containing local workspace state", async () => {
        const zip = new AdmZip(archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]));
        zip.addFile(".pacman/local/state.json", Buffer.from("{}"));
        mockAxiosGet(ARCHIVE_URL, zip.toBuffer(), { etag: eTag("revision-1") });

        await expect(new WorkspaceService(testContext).clone(PACKAGE_KEY)).rejects.toThrow(
            "Archive contains local Pacman workspace state"
        );
    });

    it("pushes resolved changes and refreshes disposable metadata", async () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides", "Guide.md"), path.join(process.cwd(), "Pages", "Guide.md"));
        fs.writeFileSync(path.join(process.cwd(), "Pages", "Guide.md"), "changed");
        const service = new WorkspaceService(testContext);
        service.move("Guides/Guide.md", "Pages/Guide.md", true);
        const zip = jest.spyOn(fileService, "zipDirectoryAsSinglePackage");
        const originalRename = fs.renameSync;
        const rename = jest.spyOn(fs, "renameSync").mockImplementation((source, target) => {
            const workspaceRoot = `${process.cwd()}${path.sep}`;
            const refreshPrefix = path.join(
                path.dirname(process.cwd()),
                `.${path.basename(process.cwd())}-pacman-refresh-`
            );
            const sourcePath = path.resolve(source.toString());
            const targetPath = path.resolve(target.toString());
            const sourceOnWorkspaceFilesystem =
                sourcePath.startsWith(workspaceRoot) || sourcePath.startsWith(refreshPrefix);
            const targetOnWorkspaceFilesystem =
                targetPath.startsWith(workspaceRoot) || targetPath.startsWith(refreshPrefix);
            if (sourceOnWorkspaceFilesystem !== targetOnWorkspaceFilesystem) {
                throw Object.assign(new Error("cross-device rename"), { code: "EXDEV" });
            }
            originalRename(source, target);
        });
        mockAxiosPost(PUSH_URL, {});
        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Pages/Guide.md", content: "changed" }]),
            { etag: eTag("revision-2") }
        );

        try {
            await service.push(undefined, true);
        } finally {
            rename.mockRestore();
        }

        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
            PUSH_URL,
            expect.anything(),
            expect.objectContaining({
                params: { overwrite: true },
                headers: expect.objectContaining({ "If-Match": eTag("revision-1") }),
            })
        );
        const include = zip.mock.calls[0][1]!;
        expect(include(".pacman/local/state.json")).toBe(false);
        expect(include(".pacman/nodes/node-1.json")).toBe(true);
        const form = (mockedAxiosInstance.post as jest.Mock).mock.calls[0][1] as { _streams: unknown[] };
        expect(form._streams).toContain(JSON.stringify({ moves: { "node-1": "Pages/Guide.md" } }));
        expect(service.status()).toEqual([]);
        expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))).toEqual({
            schemaVersion: 1,
            serverRevision: eTag("revision-2"),
            baselineDigests: { "node-1": digest("changed") },
            moveHints: {},
        });
    });

    it("invalidates local state when post-push refresh fails", async () => {
        writeWorkspace();
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "changed");
        mockAxiosPost(PUSH_URL, {});
        mockAxiosGetError(ARCHIVE_URL, 503, { message: "unavailable" });
        const service = new WorkspaceService(testContext);

        await expect(service.push()).rejects.toThrow("Push succeeded, but local state refresh failed");
        expect(fs.existsSync(path.join(process.cwd(), ".pacman", "local", "state.json"))).toBe(false);

        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "changed" }]),
            { etag: eTag("revision-2") }
        );
        await service.pull();
        expect(service.status()).toEqual([]);
    });

    it("preserves the metadata backup when refresh and rollback both fail", async () => {
        writeWorkspace();
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "changed");
        mockAxiosPost(PUSH_URL, {});
        mockAxiosGet(
            ARCHIVE_URL,
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "changed" }]),
            { etag: eTag("revision-2") }
        );
        const originalRename = fs.renameSync;
        const rename = jest.spyOn(fs, "renameSync").mockImplementation((source, target) => {
            if (target.toString() === path.join(process.cwd(), ".pacman")) {
                throw new Error("rename failed");
            }
            originalRename(source, target);
        });
        let backup: string | undefined;

        try {
            await new WorkspaceService(testContext).push();
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            const match = (error as Error).message.match(/backup remains at (.+?)\. Run workspace pull before retrying\.$/);
            backup = match?.[1];
        } finally {
            rename.mockRestore();
        }

        expect(backup).toBeDefined();
        expect(fs.existsSync(backup!)).toBe(true);
        expect(backup!.startsWith(`${process.cwd()}${path.sep}`)).toBe(false);
        originalRename(backup!, path.join(process.cwd(), ".pacman"));
        fs.rmSync(path.dirname(backup!), { recursive: true, force: true });
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
