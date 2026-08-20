import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import AdmZip = require("adm-zip");
import { WorkspaceService } from "../../../src/commands/workspace/workspace.service";
import { WorkspaceGitService } from "../../../src/commands/workspace/workspace-git.service";
import { fileService } from "../../../src/core/utils/file-service";
import { logger } from "../../../src/core/utils/logger";
import { testContext } from "../../utls/test-context";
import {
    mockAxiosDelete,
    mockAxiosGet,
    mockAxiosGetError,
    mockAxiosPatch,
    mockAxiosPost,
    mockAxiosPut,
    mockAxiosPutError,
    mockedAxiosInstance,
} from "../../utls/http-requests-mock";

const PACKAGE_KEY = "pkg-1";
const BRANCH = "feature-a";
const BRANCH_PACKAGE_KEY = `${PACKAGE_KEY}@${BRANCH}`;
const ARCHIVE_URL = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/file-archive`;
const PUSH_URL = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/file-archive`;

function archiveUrl(packageKey: string): string {
    return `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/file-archive`;
}

function fileUrl(filePath: string): string {
    return `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/files/${filePath}`;
}

function manifestUrl(packageKey: string = PACKAGE_KEY): string {
    return `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/files`;
}

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
                folderKey =
                    folderPath === "Guides"
                        ? "folder-1"
                        : `folder-${createHash("sha256").update(folderPath).digest("hex").slice(0, 12)}`;
                folders.set(folderPath, folderKey);
                nodes[folderKey] = {
                    key: folderKey,
                    name: segments[index],
                    type: "FOLDER",
                    parentNodeKey,
                };
            }
            parentNodeKey = folderKey;
        }
        nodes[file.nodeKey] = {
            key: file.nodeKey,
            name: path.posix.basename(file.path, path.posix.extname(file.path)),
            type: "MARKDOWN_FILE",
            parentNodeKey,
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
        activePackageKey: PACKAGE_KEY,
        activeBranch: "main",
        serverRevision,
        baselineDigests: Object.fromEntries(files.map(file => [file.nodeKey, digest(file.content)])),
        moveHints,
    };
}

function archive(files: TestFile[]): Buffer {
    const zip = new AdmZip();
    zip.addFile(".pacman/.gitignore", Buffer.from("local/\n"));
    zip.addFile(".pacman/package.json", Buffer.from(JSON.stringify({ schemaVersion: 1, projectKey: PACKAGE_KEY })));
    zip.addFile(".pacman/nodes/", Buffer.alloc(0));
    Object.entries(metadata(files)).forEach(([nodeKey, node]) => {
        zip.addFile(`.pacman/nodes/${nodeKey}.json`, Buffer.from(JSON.stringify(node)));
    });
    files.forEach(file => zip.addFile(file.path, Buffer.from(file.content)));
    return zip.toBuffer();
}

function manifest(files: TestFile[]): Buffer {
    const nodes = metadata(files) as Record<
        string,
        { key: string; name: string; type: string; parentNodeKey?: string | null }
    >;
    const byKey = new Map(Object.entries(nodes));
    const paths = new Map<string, string>();
    const resolvePath = (node: { key: string; parentNodeKey?: string | null }): string => {
        const cached = paths.get(node.key);
        if (cached) {
            return cached;
        }
        const metadataNode = nodes[node.key];
        const parent = metadataNode.parentNodeKey ? byKey.get(metadataNode.parentNodeKey) : undefined;
        const segment = `${metadataNode.name}${metadataNode.type === "FOLDER" ? "" : ".md"}`;
        const filePath = parent ? `${resolvePath(parent)}/${segment}` : segment;
        paths.set(node.key, filePath);
        return filePath;
    };
    return Buffer.from(
        JSON.stringify({
            nodes: Object.values(nodes).map(node => {
                const file = files.find(candidate => candidate.nodeKey === node.key);
                return file
                    ? {
                          nodeKey: node.key,
                          path: resolvePath(node),
                          kind: "file",
                          assetType: node.type,
                          mediaType: "text/markdown",
                          size: Buffer.byteLength(file.content),
                          contentDigest: digest(file.content),
                          eTag: eTag(file.content),
                          metadata: node,
                      }
                    : { nodeKey: node.key, path: resolvePath(node), kind: "folder", metadata: node };
            }),
            documents: {},
        })
    );
}

function mockManifest(files: TestFile[], packageKey: string = PACKAGE_KEY): void {
    mockAxiosGet(manifestUrl(packageKey), manifest(files), { etag: eTag("manifest") });
}

function writeWorkspace(
    files: TestFile[] = [{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]
): void {
    fs.mkdirSync(path.join(process.cwd(), ".pacman", "nodes"), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), ".pacman", "local"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), ".pacman", ".gitignore"), "local/\n");
    fs.writeFileSync(
        path.join(process.cwd(), ".pacman", "package.json"),
        JSON.stringify({ schemaVersion: 1, projectKey: PACKAGE_KEY })
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
    [
        ".git",
        ".pacman",
        "Guides",
        "Pages",
        "Other",
        "New",
        "Bulk",
        "Added",
        "Deleted",
        "Old",
        "Selected",
        "Unselected",
        PACKAGE_KEY,
        "branch-workspace",
    ].forEach(entry => fs.rmSync(path.join(process.cwd(), entry), { recursive: true, force: true }));
}

function mockGit(
    observation: { branch: string; head: string } | undefined,
    mappedBranch?: string
): jest.Mocked<WorkspaceGitService> {
    return {
        observe: jest.fn().mockResolvedValue(observation),
        mappedPacmanBranch: jest.fn().mockResolvedValue(mappedBranch),
        link: jest.fn().mockResolvedValue(observation),
    } as unknown as jest.Mocked<WorkspaceGitService>;
}

describe("Workspace service", () => {
    beforeEach(removeWorkspace);
    afterEach(removeWorkspace);

    it("clones and validates a filesystem archive", async () => {
        mockAxiosGet(ARCHIVE_URL, archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]), {
            etag: eTag("revision-1"),
        });
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
                activePackageKey: PACKAGE_KEY,
                activeBranch: "main",
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
        mockAxiosGet(ARCHIVE_URL, archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]));

        await expect(new WorkspaceService(testContext).clone(PACKAGE_KEY)).rejects.toThrow(
            "Filesystem archive response does not contain an ETag."
        );
    });

    it("clones a selected branch while keeping stable project identity", async () => {
        mockAxiosGet(
            archiveUrl(BRANCH_PACKAGE_KEY),
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "branch" }]),
            { etag: eTag("branch-revision") }
        );

        await new WorkspaceService(testContext).clone(PACKAGE_KEY, "branch-workspace", { branch: BRANCH });

        const root = path.join(process.cwd(), "branch-workspace");
        expect(JSON.parse(fs.readFileSync(path.join(root, ".pacman", "package.json"), "utf-8"))).toEqual({
            schemaVersion: 1,
            projectKey: PACKAGE_KEY,
        });
        expect(JSON.parse(fs.readFileSync(path.join(root, ".pacman", "local", "state.json"), "utf-8"))).toMatchObject({
            activePackageKey: BRANCH_PACKAGE_KEY,
            activeBranch: BRANCH,
        });
        fs.rmSync(root, { recursive: true, force: true });
    });

    it("checks out an existing branch atomically", async () => {
        writeWorkspace();
        mockAxiosGet(
            archiveUrl(BRANCH_PACKAGE_KEY),
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "branch" }]),
            { etag: eTag("branch-revision") }
        );

        await new WorkspaceService(testContext).checkout(BRANCH);

        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("branch");
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toMatchObject({
            activePackageKey: BRANCH_PACKAGE_KEY,
            activeBranch: BRANCH,
            moveHints: {},
        });
    });

    it("creates a branch from the active remote target and retains local edits", async () => {
        writeWorkspace();
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "local edit");
        mockAxiosPost(`https://myTeam.celonis.cloud/pacman/api/core/packages/${PACKAGE_KEY}/branches`, {
            projectKey: PACKAGE_KEY,
            branchKey: BRANCH,
            packageKey: BRANCH_PACKAGE_KEY,
        });
        mockAxiosGet(
            archiveUrl(BRANCH_PACKAGE_KEY),
            archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]),
            { etag: eTag("branch-revision") }
        );
        const service = new WorkspaceService(testContext);

        await service.checkout(BRANCH, { create: true });

        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("local edit");
        expect(service.status()).toEqual([{ path: "Guides/Guide.md", status: "modified" }]);
        expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
            `https://myTeam.celonis.cloud/pacman/api/core/packages/${PACKAGE_KEY}/branches`,
            JSON.stringify({ branchKey: BRANCH, version: "STAGING" }),
            expect.anything()
        );
    });

    it("links a Git branch without overwriting checked-out files", async () => {
        writeWorkspace();
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "git content");
        const observation = { branch: "git-feature", head: "a".repeat(40) };
        const git = mockGit(observation);
        mockManifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "remote" }], BRANCH_PACKAGE_KEY);
        const service = new WorkspaceService(testContext, git);

        await service.checkout(BRANCH, { linkGit: true });

        expect(git.link).toHaveBeenCalledWith(process.cwd(), PACKAGE_KEY, "git-feature", BRANCH);
        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("git content");
        expect(service.status()).toEqual([{ path: "Guides/Guide.md", status: "modified" }]);
    });

    it("rehydrates a mapped Pacman baseline after an external Git branch switch", async () => {
        writeWorkspace();
        const statePath = path.join(process.cwd(), ".pacman", "local", "state.json");
        fs.writeFileSync(
            statePath,
            JSON.stringify({
                ...state([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]),
                git: { branch: "main", head: "a".repeat(40) },
                moveHints: { "node-1": "Old.md" },
            })
        );
        const observation = { branch: "git-feature", head: "b".repeat(40) };
        const git = mockGit(observation, BRANCH);
        mockManifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }], BRANCH_PACKAGE_KEY);
        const service = new WorkspaceService(testContext, git);

        await expect(service.statusWithGit()).resolves.toEqual([]);

        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("original");
        expect(JSON.parse(fs.readFileSync(statePath, "utf-8"))).toMatchObject({
            activePackageKey: BRANCH_PACKAGE_KEY,
            activeBranch: BRANCH,
            moveHints: {},
            git: observation,
        });
    });

    it("rehydrates the baseline when Git advances on the mapped branch", async () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides/Guide.md"), path.join(process.cwd(), "Pages/Guide.md"));
        const statePath = path.join(process.cwd(), ".pacman", "local", "state.json");
        fs.writeFileSync(
            statePath,
            JSON.stringify({
                ...state([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]),
                git: { branch: "main", head: "a".repeat(40) },
                moveHints: { "node-1": "Pages/Guide.md" },
            })
        );
        const observation = { branch: "main", head: "b".repeat(40) };
        const git = mockGit(observation);
        mockManifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]);
        const service = new WorkspaceService(testContext, git);

        await expect(service.statusWithGit()).resolves.toEqual([{ path: "Pages/Guide.md", status: "moved" }]);

        expect(JSON.parse(fs.readFileSync(statePath, "utf-8"))).toMatchObject({
            activePackageKey: PACKAGE_KEY,
            moveHints: {},
            git: observation,
        });
        expect(git.mappedPacmanBranch).not.toHaveBeenCalled();
        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(manifestUrl(), expect.anything());
    });

    it("rehydrates without overwriting files after Git advances on the mapped branch", async () => {
        writeWorkspace();
        const statePath = path.join(process.cwd(), ".pacman", "local", "state.json");
        fs.writeFileSync(
            statePath,
            JSON.stringify({
                ...state([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]),
                git: { branch: "main", head: "a".repeat(40) },
            })
        );
        const observation = { branch: "main", head: "b".repeat(40) };
        mockManifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "remote" }]);

        await new WorkspaceService(testContext, mockGit(observation)).pull();

        expect(fs.readFileSync(path.join(process.cwd(), "Guides/Guide.md"), "utf-8")).toBe("original");
        expect(new WorkspaceService(testContext, mockGit(observation)).status()).toEqual([
            { path: "Guides/Guide.md", status: "modified" },
        ]);
        expect(JSON.parse(fs.readFileSync(statePath, "utf-8"))).toMatchObject({ git: observation });
    });

    it("blocks pushes from detached or unmapped switched Git branches", async () => {
        writeWorkspace();
        const statePath = path.join(process.cwd(), ".pacman", "local", "state.json");
        fs.writeFileSync(
            statePath,
            JSON.stringify({
                ...state([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]),
                git: { branch: "main", head: "a".repeat(40) },
            })
        );

        await expect(
            new WorkspaceService(testContext, mockGit({ branch: "", head: "b".repeat(40) })).push()
        ).rejects.toThrow("Detached Git HEAD");
        await expect(
            new WorkspaceService(testContext, mockGit({ branch: "unmapped", head: "c".repeat(40) })).push()
        ).rejects.toThrow("is not mapped to a Pacman branch");
    });

    it("blocks pushes from a Git worktree that has not been linked", async () => {
        writeWorkspace();

        await expect(
            new WorkspaceService(testContext, mockGit({ branch: "main", head: "a".repeat(40) })).push()
        ).rejects.toThrow("is not linked to a Pacman branch");
    });

    it("pulls only a changed remote body into a clean existing workspace", async () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), ".git"));
        fs.writeFileSync(path.join(process.cwd(), ".git", "marker"), "keep");
        const workspaceInode = fs.statSync(process.cwd()).ino;
        mockManifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "remote" }]);
        mockAxiosGet(fileUrl("Guides/Guide.md"), Buffer.from("remote"), { etag: eTag("remote") });

        await new WorkspaceService(testContext).pull();

        expect(fs.statSync(process.cwd()).ino).toBe(workspaceInode);
        expect(fs.readFileSync(path.join(process.cwd(), ".git", "marker"), "utf-8")).toBe("keep");
        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("remote");
        expect(new WorkspaceService(testContext).status()).toEqual([]);
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toMatchObject({
            baselineDigests: { "node-1": digest("remote") },
            moveHints: {},
        });
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).not.toHaveProperty("serverRevision");
    });

    it("downloads only three changed bodies from a one hundred file manifest", async () => {
        const original = Array.from({ length: 100 }, (_, index) => ({
            nodeKey: `node-${index}`,
            path: `Bulk/File-${index}.md`,
            content: `original-${index}`,
        }));
        const changedIndexes = new Set([1, 50, 99]);
        const remote = original.map((file, index) =>
            changedIndexes.has(index) ? { ...file, content: `remote-${index}` } : file
        );
        writeWorkspace(original);
        mockManifest(remote);
        remote.forEach((file, index) => {
            if (changedIndexes.has(index)) {
                mockAxiosGet(fileUrl(file.path), Buffer.from(file.content), { etag: eTag(file.content) });
            }
        });

        await new WorkspaceService(testContext).pull();

        const bodyReads = (mockedAxiosInstance.get as jest.Mock).mock.calls.filter(([url]) => url !== manifestUrl());
        expect(bodyReads).toHaveLength(3);
        changedIndexes.forEach(index => {
            expect(fs.readFileSync(path.join(process.cwd(), remote[index].path), "utf-8")).toBe(`remote-${index}`);
        });
    });

    it("limits pull to a selected directory and leaves omitted remote changes untouched", async () => {
        const original = [
            { nodeKey: "node-1", path: "Selected/One.md", content: "one" },
            { nodeKey: "node-2", path: "Selected/Nested/Two.md", content: "two" },
            { nodeKey: "node-3", path: "Unselected/Three.md", content: "three" },
        ];
        const remote = original.map(file => ({ ...file, content: `${file.content} remote` }));
        writeWorkspace(original);
        mockManifest(remote);
        remote.slice(0, 2).forEach(file => {
            mockAxiosGet(fileUrl(file.path), Buffer.from(file.content), { etag: eTag(file.content) });
        });

        await new WorkspaceService(testContext).pull(["selected"]);

        expect(fs.readFileSync(path.join(process.cwd(), remote[0].path), "utf-8")).toBe("one remote");
        expect(fs.readFileSync(path.join(process.cwd(), remote[1].path), "utf-8")).toBe("two remote");
        expect(fs.readFileSync(path.join(process.cwd(), remote[2].path), "utf-8")).toBe("three");
        expect((mockedAxiosInstance.get as jest.Mock).mock.calls.filter(([url]) => url !== manifestUrl())).toHaveLength(
            2
        );
    });

    it("applies clean remote additions moves deletions and modifications by node identity", async () => {
        const original = [
            { nodeKey: "node-1", path: "Guides/Modified.md", content: "one" },
            { nodeKey: "node-2", path: "Old/Moved.md", content: "two" },
            { nodeKey: "node-3", path: "Deleted/Gone.md", content: "three" },
        ];
        const remote = [
            { ...original[0], content: "one remote" },
            { ...original[1], path: "New/Moved.md" },
            { nodeKey: "node-4", path: "Added/New.md", content: "four" },
        ];
        writeWorkspace(original);
        mockManifest(remote);
        mockAxiosGet(fileUrl(remote[0].path), Buffer.from(remote[0].content), { etag: eTag(remote[0].content) });
        mockAxiosGet(fileUrl(remote[2].path), Buffer.from(remote[2].content), { etag: eTag(remote[2].content) });

        await new WorkspaceService(testContext).pull();

        expect(fs.readFileSync(path.join(process.cwd(), remote[0].path), "utf-8")).toBe("one remote");
        expect(fs.readFileSync(path.join(process.cwd(), remote[1].path), "utf-8")).toBe("two");
        expect(fs.existsSync(path.join(process.cwd(), original[1].path))).toBe(false);
        expect(fs.existsSync(path.join(process.cwd(), original[2].path))).toBe(false);
        expect(fs.readFileSync(path.join(process.cwd(), remote[2].path), "utf-8")).toBe("four");
        expect(fs.existsSync(path.join(process.cwd(), "Old"))).toBe(false);
        expect(fs.existsSync(path.join(process.cwd(), "Deleted"))).toBe(false);
        expect(fs.statSync(path.join(process.cwd(), "New")).isDirectory()).toBe(true);
        expect(fs.statSync(path.join(process.cwd(), "Added")).isDirectory()).toBe(true);
        expect(new WorkspaceService(testContext).status()).toEqual([]);
    });

    it("pulls a workspace whose root metadata still names the concrete Package parent", async () => {
        const original = [{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }];
        writeWorkspace(original);
        const folderMetadataPath = path.join(process.cwd(), ".pacman", "nodes", "folder-1.json");
        const folderMetadata = JSON.parse(fs.readFileSync(folderMetadataPath, "utf-8"));
        fs.writeFileSync(folderMetadataPath, JSON.stringify({ ...folderMetadata, parentNodeKey: PACKAGE_KEY }));
        mockManifest(original);

        await new WorkspaceService(testContext).pull();

        expect(new WorkspaceService(testContext).status()).toEqual([]);
        expect(JSON.parse(fs.readFileSync(folderMetadataPath, "utf-8"))).toMatchObject({
            key: "folder-1",
            parentNodeKey: null,
        });
    });

    it("deletes nested remote folders deepest first", async () => {
        const original = [{ nodeKey: "node-1", path: "Deleted/Parent/Child/Guide.md", content: "one" }];
        writeWorkspace(original);
        mockManifest([]);

        await new WorkspaceService(testContext).pull();

        expect(fs.existsSync(path.join(process.cwd(), "Deleted"))).toBe(false);
        expect(fs.readdirSync(path.join(process.cwd(), ".pacman", "nodes"))).toEqual([]);
        expect(new WorkspaceService(testContext).status()).toEqual([]);
    });

    it("reports a local and remote conflict while advancing an independent successful node", async () => {
        const original = [
            { nodeKey: "node-1", path: "Guides/Conflict.md", content: "one" },
            { nodeKey: "node-2", path: "Guides/Success.md", content: "two" },
        ];
        const remote = [
            { ...original[0], content: "one remote" },
            { ...original[1], content: "two remote" },
        ];
        writeWorkspace(original);
        fs.writeFileSync(path.join(process.cwd(), original[0].path), "one local");
        mockManifest(remote);
        mockAxiosGet(fileUrl(remote[1].path), Buffer.from(remote[1].content), { etag: eTag(remote[1].content) });

        await expect(new WorkspaceService(testContext).pull()).rejects.toThrow("Workspace pull failed for 1 node(s)");

        expect(fs.readFileSync(path.join(process.cwd(), original[0].path), "utf-8")).toBe("one local");
        expect(fs.readFileSync(path.join(process.cwd(), original[1].path), "utf-8")).toBe("two remote");
        const localState = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman/local/state.json"), "utf-8"));
        expect(localState.baselineDigests).toEqual({
            "node-1": digest("one"),
            "node-2": digest("two remote"),
        });
        expect(localState).not.toHaveProperty("serverRevision");
    });

    it("rejects paths with a full pull", async () => {
        writeWorkspace();

        await expect(new WorkspaceService(testContext).pull(["Guides"], { full: true })).rejects.toThrow(
            "Workspace paths cannot be combined with --full"
        );
        expect(mockedAxiosInstance.get).not.toHaveBeenCalled();
    });

    it("hydrates local state after an external Git restore without overwriting files", async () => {
        writeWorkspace();
        fs.rmSync(path.join(process.cwd(), ".pacman", "local"), { recursive: true });
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "git change");
        mockManifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "remote" }]);

        await new WorkspaceService(testContext).pull();

        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("git change");
        expect(new WorkspaceService(testContext).status()).toEqual([{ path: "Guides/Guide.md", status: "modified" }]);
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toMatchObject({ baselineDigests: { "node-1": digest("remote") } });
    });

    it("restores the mapped Pacman branch after an external Git restore", async () => {
        writeWorkspace();
        fs.rmSync(path.join(process.cwd(), ".pacman", "local"), { recursive: true });
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "git branch content");
        const observation = { branch: "git-feature", head: "b".repeat(40) };
        const git = mockGit(observation, BRANCH);
        mockManifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "branch baseline" }], BRANCH_PACKAGE_KEY);

        await new WorkspaceService(testContext, git).pull();

        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("git branch content");
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toMatchObject({
            activePackageKey: BRANCH_PACKAGE_KEY,
            activeBranch: BRANCH,
            git: observation,
        });
    });

    it("hydrates a Git-restored workspace with CRLF metadata ignore rules", async () => {
        writeWorkspace();
        fs.rmSync(path.join(process.cwd(), ".pacman", "local"), { recursive: true });
        fs.writeFileSync(path.join(process.cwd(), ".pacman", ".gitignore"), "local/\r\n");
        mockManifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]);

        const service = new WorkspaceService(testContext);
        await service.pull();

        expect(service.status()).toEqual([]);
    });

    it("keeps Git-restored path drift as a move for the next push", async () => {
        writeWorkspace([{ nodeKey: "node-1", path: "Pages/Guide.md", content: "original" }]);
        fs.rmSync(path.join(process.cwd(), ".pacman", "local"), { recursive: true });
        mockManifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]);
        const service = new WorkspaceService(testContext);

        await service.pull();

        expect(service.status()).toEqual([{ path: "Pages/Guide.md", status: "moved" }]);
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toMatchObject({
            moveHints: {
                "node-1": { sourcePath: "Guides/Guide.md", targetPath: "Pages/Guide.md" },
            },
        });

        mockAxiosGet(fileUrl("Guides/Guide.md"), Buffer.from("original"), { etag: eTag("file-1") });
        mockAxiosPatch(fileUrl("Guides/Guide.md"), {
            path: "Pages/Guide.md",
            nodeKey: "node-1",
            assetType: "MARKDOWN_FILE",
            eTag: eTag("file-2"),
        });
        mockManifest([{ nodeKey: "node-1", path: "Pages/Guide.md", content: "original" }]);
        await service.push();

        expect(mockedAxiosInstance.patch).toHaveBeenCalledWith(
            fileUrl("Guides/Guide.md"),
            JSON.stringify({ targetPath: "Pages/Guide.md" }),
            expect.objectContaining({ headers: expect.objectContaining({ "If-Match": eTag("file-1") }) })
        );
        expect(service.status()).toEqual([]);
    });

    it("preserves local-only changes during an incremental pull", async () => {
        writeWorkspace();
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "local");

        mockManifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]);

        await new WorkspaceService(testContext).pull();
        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("local");
    });

    it("rejects manifest metadata containing a legacy filesystem name", async () => {
        writeWorkspace();
        const body = JSON.parse(
            manifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]).toString()
        );
        body.nodes.find((node: { nodeKey: string }) => node.nodeKey === "node-1").metadata.additionalFields = {
            filesystemName: "Renamed.md",
        };
        mockAxiosGet(manifestUrl(), Buffer.from(JSON.stringify(body)), { etag: eTag("manifest") });

        await expect(new WorkspaceService(testContext).pull()).rejects.toThrow("Unsupported workspace manifest");
    });

    it("rejects a manifest path that does not match derived Node metadata", async () => {
        writeWorkspace();
        const body = JSON.parse(
            manifest([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "original" }]).toString()
        );
        body.nodes.find((node: { nodeKey: string }) => node.nodeKey === "node-1").path = "Guides/Renamed.md";
        mockAxiosGet(manifestUrl(), Buffer.from(JSON.stringify(body)), { etag: eTag("manifest") });

        await expect(new WorkspaceService(testContext).pull()).rejects.toThrow(
            "path that does not match Node metadata"
        );
    });

    it("restores the existing workspace when applying a pull fails", async () => {
        writeWorkspace();
        mockAxiosGet(ARCHIVE_URL, archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "remote" }]), {
            etag: eTag("revision-2"),
        });
        const originalRename = fs.renameSync;
        const rename = jest.spyOn(fs, "renameSync").mockImplementation((source, target) => {
            const sourceParent = path.basename(path.dirname(source.toString()));
            if (sourceParent.startsWith(".pacman-pull-") && !sourceParent.startsWith(".pacman-pull-backup-")) {
                throw new Error("apply failed");
            }
            originalRename(source, target);
        });

        try {
            await expect(new WorkspaceService(testContext).pull([], { full: true })).rejects.toThrow("apply failed");
        } finally {
            rename.mockRestore();
        }
        expect(fs.readFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "utf-8")).toBe("original");
        expect(new WorkspaceService(testContext).status()).toEqual([]);
    });

    it("preserves the workspace backup when pull and rollback both fail", async () => {
        writeWorkspace();
        mockAxiosGet(ARCHIVE_URL, archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "remote" }]), {
            etag: eTag("revision-2"),
        });
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
            await new WorkspaceService(testContext).pull([], { full: true });
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
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toMatchObject({
            moveHints: { "node-1": "Pages/Guide.md" },
        });
    });

    it("records a move when the source casing differs from metadata", () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides", "Guide.md"), path.join(process.cwd(), "Pages", "Guide.md"));
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

    it("rejects an explicit filename-only rename", () => {
        writeWorkspace();

        expect(() => new WorkspaceService(testContext).move("Guides/Guide.md", "Pages/Renamed.md")).toThrow(
            "Filename-only rename is not supported"
        );
        expect(fs.existsSync(path.join(process.cwd(), "Guides", "Guide.md"))).toBe(true);
    });

    it("reports an unchanged filename rename by another tool as unresolved", () => {
        writeWorkspace();
        fs.renameSync(path.join(process.cwd(), "Guides", "Guide.md"), path.join(process.cwd(), "Guides", "Renamed.md"));

        expect(new WorkspaceService(testContext).status()).toEqual([
            { path: "Guides/Renamed.md", status: "unresolved" },
        ]);
    });

    it("records an explicit move after the source was edited", () => {
        writeWorkspace();
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "changed");
        const service = new WorkspaceService(testContext);

        service.move("Guides/Guide.md", "Pages/Guide.md");

        expect(service.status()).toEqual([{ path: "Pages/Guide.md", status: "moved, modified" }]);
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toMatchObject({
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

        expect(() => new WorkspaceService(testContext).move("Guides/Guide.md", "Pages/Guide.md", true)).toThrow(
            "Moved file not found"
        );
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

    it("derives stable Node-key suffixes for colliding display names", () => {
        writeWorkspace([
            { nodeKey: "node-1", path: "Guides/One.md", content: "one" },
            { nodeKey: "node-2", path: "Guides/Two.md", content: "two" },
        ]);
        const secondPath = path.join(process.cwd(), ".pacman", "nodes", "node-2.json");
        const second = JSON.parse(fs.readFileSync(secondPath, "utf-8"));
        second.name = "One";
        fs.writeFileSync(secondPath, JSON.stringify(second));
        const firstLeaf = `One~${createHash("sha256").update("node-1").digest("hex").slice(0, 12)}.md`;
        const secondLeaf = `One~${createHash("sha256").update("node-2").digest("hex").slice(0, 12)}.md`;
        fs.renameSync(path.join(process.cwd(), "Guides", "One.md"), path.join(process.cwd(), "Guides", firstLeaf));
        fs.renameSync(path.join(process.cwd(), "Guides", "Two.md"), path.join(process.cwd(), "Guides", secondLeaf));

        expect(new WorkspaceService(testContext).status()).toEqual([]);
    });

    it("rejects legacy filesystem names in stable Node metadata", () => {
        writeWorkspace();
        const nodePath = path.join(process.cwd(), ".pacman", "nodes", "node-1.json");
        const node = JSON.parse(fs.readFileSync(nodePath, "utf-8"));
        node.additionalFields = { filesystemName: "Renamed.md" };
        fs.writeFileSync(nodePath, JSON.stringify(node));

        expect(() => new WorkspaceService(testContext).status()).toThrow("Invalid node metadata file");
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
        const readdir = jest.spyOn(fs, "readdirSync").mockImplementation(((
            directory: fs.PathLike,
            options?: object
        ) => {
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

    it("rejects a case-only filename rename", () => {
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
            expect(() => service.move("Guides/Guide.md", "Guides/guide.md")).toThrow(
                "Filename-only rename is not supported"
            );
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

    it("pushes only three changed files from a one hundred file workspace", async () => {
        const original = Array.from({ length: 100 }, (_, index) => ({
            nodeKey: `node-${index}`,
            path: `Bulk/File-${index}.md`,
            content: `original-${index}`,
        }));
        const changedIndexes = new Set([1, 50, 99]);
        writeWorkspace(original);
        original.forEach((file, index) => {
            if (!changedIndexes.has(index)) {
                return;
            }
            fs.writeFileSync(path.join(process.cwd(), file.path), `changed-${index}`);
            mockAxiosGet(fileUrl(file.path), Buffer.from(file.content), { etag: eTag(`file-${index}`) });
            mockAxiosPut(fileUrl(file.path), {
                path: file.path,
                nodeKey: file.nodeKey,
                assetType: "MARKDOWN_FILE",
                eTag: eTag(`changed-${index}`),
            });
        });
        const remote = original.map((file, index) => ({
            ...file,
            content: changedIndexes.has(index) ? `changed-${index}` : file.content,
        }));
        mockManifest(remote);

        await new WorkspaceService(testContext).push();

        expect(mockedAxiosInstance.put).toHaveBeenCalledTimes(3);
        expect(mockedAxiosInstance.patch).not.toHaveBeenCalled();
        expect(mockedAxiosInstance.delete).not.toHaveBeenCalled();
        expect(new WorkspaceService(testContext).status()).toEqual([]);
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman/local/state.json"), "utf-8"))
        ).not.toHaveProperty("serverRevision");
    });

    it("limits a path-selected push and does not treat omitted paths as deletions", async () => {
        const original = [
            { nodeKey: "node-1", path: "Selected/One.md", content: "one" },
            { nodeKey: "node-2", path: "Selected/Two.md", content: "two" },
            { nodeKey: "node-3", path: "Unselected/Three.md", content: "three" },
        ];
        writeWorkspace(original);
        fs.writeFileSync(path.join(process.cwd(), "Selected/One.md"), "one changed");
        fs.writeFileSync(path.join(process.cwd(), "Selected/Two.md"), "two changed");
        fs.rmSync(path.join(process.cwd(), "Unselected/Three.md"));
        mockAxiosGet(fileUrl("Selected/One.md"), Buffer.from("one"), { etag: eTag("one") });
        mockAxiosPut(fileUrl("Selected/One.md"), {
            path: "Selected/One.md",
            nodeKey: "node-1",
            assetType: "MARKDOWN_FILE",
            eTag: eTag("one changed"),
        });
        mockManifest([{ ...original[0], content: "one changed" }, original[1], original[2]]);

        await new WorkspaceService(testContext).push(["Selected/One.md"]);

        expect(mockedAxiosInstance.put).toHaveBeenCalledTimes(1);
        expect(mockedAxiosInstance.delete).not.toHaveBeenCalled();
        expect(new WorkspaceService(testContext).status()).toEqual([
            { path: "Selected/Two.md", status: "modified" },
            { path: "Unselected/Three.md", status: "deleted" },
        ]);
    });

    it("does not report the whole workspace clean when selected push paths have no changes", async () => {
        const files = [
            { nodeKey: "node-1", path: "Selected/Clean.md", content: "clean" },
            { nodeKey: "node-2", path: "Unselected/Dirty.md", content: "original" },
        ];
        writeWorkspace(files);
        fs.writeFileSync(path.join(process.cwd(), "Unselected/Dirty.md"), "changed");
        const info = jest.spyOn(logger, "info");

        await new WorkspaceService(testContext).push(["Selected/Clean.md"]);

        expect(info).toHaveBeenCalledWith("Selected paths have no changes.");
        expect(info).not.toHaveBeenCalledWith("Workspace is clean.");
        expect(mockedAxiosInstance.put).not.toHaveBeenCalled();
        expect(new WorkspaceService(testContext).status()).toEqual([
            { path: "Unselected/Dirty.md", status: "modified" },
        ]);
    });

    it("preserves move hints for files omitted from a path-selected push", async () => {
        const original = [
            { nodeKey: "node-1", path: "Guides/One.md", content: "one" },
            { nodeKey: "node-2", path: "Guides/Two.md", content: "two" },
        ];
        writeWorkspace(original);
        const service = new WorkspaceService(testContext);
        service.move("Guides/One.md", "Pages/One.md");
        service.move("Guides/Two.md", "Pages/Two.md");
        mockAxiosGet(fileUrl("Guides/One.md"), Buffer.from("one"), { etag: eTag("one") });
        mockAxiosPatch(fileUrl("Guides/One.md"), {
            path: "Pages/One.md",
            nodeKey: "node-1",
            assetType: "MARKDOWN_FILE",
            eTag: eTag("one-moved"),
        });
        mockManifest([{ ...original[0], path: "Pages/One.md" }, original[1]]);

        await service.push(["Pages/One.md"]);

        expect(service.status()).toEqual([{ path: "Pages/Two.md", status: "moved" }]);
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman/local/state.json"), "utf-8"))
        ).toMatchObject({ moveHints: { "node-2": "Pages/Two.md" } });
    });

    it("expands a case-insensitive selected directory to its changed descendants", async () => {
        const original = [
            { nodeKey: "node-1", path: "Selected/One.md", content: "one" },
            { nodeKey: "node-2", path: "Selected/Nested/Two.md", content: "two" },
            { nodeKey: "node-3", path: "Unselected/Three.md", content: "three" },
        ];
        writeWorkspace(original);
        original.forEach(file => fs.writeFileSync(path.join(process.cwd(), file.path), `${file.content} changed`));
        original.slice(0, 2).forEach(file => {
            mockAxiosGet(fileUrl(file.path), Buffer.from(file.content), { etag: eTag(file.nodeKey) });
            mockAxiosPut(fileUrl(file.path), {
                path: file.path,
                nodeKey: file.nodeKey,
                assetType: "MARKDOWN_FILE",
                eTag: eTag(`${file.nodeKey}-changed`),
            });
        });
        mockManifest(
            original.map((file, index) => (index < 2 ? { ...file, content: `${file.content} changed` } : file))
        );

        await new WorkspaceService(testContext).push(["selected"]);

        expect(mockedAxiosInstance.put).toHaveBeenCalledTimes(2);
        expect(new WorkspaceService(testContext).status()).toEqual([
            { path: "Unselected/Three.md", status: "modified" },
        ]);
    });

    it("pushes a metadata-backed addition without a baseline", async () => {
        const local = { nodeKey: "local-node", path: "Guides/New.md", content: "new" };
        const remote = { ...local, nodeKey: "server-node" };
        writeWorkspace([local]);
        const statePath = path.join(process.cwd(), ".pacman", "local", "state.json");
        fs.writeFileSync(statePath, JSON.stringify({ ...state([local]), baselineDigests: {} }));
        mockAxiosPut(fileUrl(local.path), {
            path: local.path,
            nodeKey: remote.nodeKey,
            assetType: "MARKDOWN_FILE",
            eTag: eTag("new"),
        });
        mockManifest([remote]);

        await new WorkspaceService(testContext).push();

        expect(mockedAxiosInstance.put).toHaveBeenCalledWith(
            fileUrl(local.path),
            Buffer.from("new"),
            expect.objectContaining({ headers: expect.objectContaining({ "If-None-Match": "*" }) })
        );
        expect(new WorkspaceService(testContext).status()).toEqual([]);
        expect(fs.existsSync(path.join(process.cwd(), ".pacman/nodes/local-node.json"))).toBe(false);
        expect(fs.existsSync(path.join(process.cwd(), ".pacman/nodes/server-node.json"))).toBe(true);
    });

    it("recovers a server-assigned node key after post-create refresh fails", async () => {
        const local = { nodeKey: "local-node", path: "Guides/New.md", content: "new" };
        const remote = { ...local, nodeKey: "server-node" };
        writeWorkspace([local]);
        const statePath = path.join(process.cwd(), ".pacman", "local", "state.json");
        fs.writeFileSync(statePath, JSON.stringify({ ...state([local]), baselineDigests: {} }));
        mockAxiosPut(fileUrl(local.path), {
            path: local.path,
            nodeKey: remote.nodeKey,
            assetType: "MARKDOWN_FILE",
            eTag: eTag("new"),
        });
        mockAxiosGetError(manifestUrl(), 503, { message: "unavailable" });
        const service = new WorkspaceService(testContext, mockGit(undefined));

        await expect(service.push()).rejects.toThrow("local synchronization state could not be refreshed");
        fs.writeFileSync(path.join(process.cwd(), local.path), "newer local edit");
        mockManifest([remote]);

        await service.pull();

        expect(fs.readFileSync(path.join(process.cwd(), local.path), "utf-8")).toBe("newer local edit");
        expect(fs.existsSync(path.join(process.cwd(), ".pacman/nodes/local-node.json"))).toBe(false);
        expect(fs.existsSync(path.join(process.cwd(), ".pacman/nodes/server-node.json"))).toBe(true);
        expect(service.status()).toEqual([{ path: local.path, status: "modified" }]);
        expect(JSON.parse(fs.readFileSync(statePath, "utf-8"))).toMatchObject({
            baselineDigests: { "server-node": digest("new") },
        });
    });

    it("retains a stale file for retry when its conditional update fails", async () => {
        writeWorkspace();
        fs.writeFileSync(path.join(process.cwd(), "Guides/Guide.md"), "changed");
        mockAxiosGet(fileUrl("Guides/Guide.md"), Buffer.from("original"), { etag: eTag("file-1") });
        mockAxiosPutError(fileUrl("Guides/Guide.md"), 412, { message: "stale" });

        await expect(new WorkspaceService(testContext).push()).rejects.toThrow("Workspace push failed for 1 file(s)");

        expect(new WorkspaceService(testContext).status()).toEqual([{ path: "Guides/Guide.md", status: "modified" }]);
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman/local/state.json"), "utf-8"))
        ).toMatchObject({ baselineDigests: { "node-1": digest("original") } });
    });

    it("refreshes successful files while retaining partial failures for retry", async () => {
        const original = [
            { nodeKey: "node-1", path: "Guides/One.md", content: "one" },
            { nodeKey: "node-2", path: "Guides/Two.md", content: "two" },
        ];
        writeWorkspace(original);
        original.forEach(file => fs.writeFileSync(path.join(process.cwd(), file.path), `${file.content} changed`));
        mockAxiosGet(fileUrl("Guides/One.md"), Buffer.from("one"), { etag: eTag("one") });
        mockAxiosGet(fileUrl("Guides/Two.md"), Buffer.from("two"), { etag: eTag("two") });
        mockAxiosPut(fileUrl("Guides/One.md"), {
            path: "Guides/One.md",
            nodeKey: "node-1",
            assetType: "MARKDOWN_FILE",
            eTag: eTag("one changed"),
        });
        mockAxiosPutError(fileUrl("Guides/Two.md"), 412, { message: "stale" });
        mockManifest([{ ...original[0], content: "one changed" }, original[1]]);

        await expect(new WorkspaceService(testContext).push()).rejects.toThrow("Workspace push failed for 1 file(s)");

        expect(new WorkspaceService(testContext).status()).toEqual([{ path: "Guides/Two.md", status: "modified" }]);
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman/local/state.json"), "utf-8"))
        ).toMatchObject({
            baselineDigests: { "node-1": digest("one changed"), "node-2": digest("two") },
        });
    });

    it("deletes a tracked file without pruning its parent folder", async () => {
        writeWorkspace();
        fs.rmSync(path.join(process.cwd(), "Guides/Guide.md"));
        mockAxiosGet(fileUrl("Guides/Guide.md"), Buffer.from("original"), { etag: eTag("file-1") });
        mockAxiosDelete(fileUrl("Guides/Guide.md"));
        mockManifest([]);

        await new WorkspaceService(testContext).push();

        expect(mockedAxiosInstance.delete).toHaveBeenCalledWith(
            fileUrl("Guides/Guide.md"),
            expect.objectContaining({ headers: expect.objectContaining({ "If-Match": eTag("file-1") }) })
        );
        expect(new WorkspaceService(testContext).status()).toEqual([]);
    });

    it("moves then updates a moved and edited file", async () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides/Guide.md"), path.join(process.cwd(), "Pages/Guide.md"));
        fs.writeFileSync(path.join(process.cwd(), "Pages/Guide.md"), "changed");
        const service = new WorkspaceService(testContext);
        service.move("Guides/Guide.md", "Pages/Guide.md", true);
        mockAxiosGet(fileUrl("Guides/Guide.md"), Buffer.from("original"), { etag: eTag("file-1") });
        mockAxiosPatch(fileUrl("Guides/Guide.md"), {
            path: "Pages/Guide.md",
            nodeKey: "node-1",
            assetType: "MARKDOWN_FILE",
            eTag: eTag("file-2"),
        });
        mockAxiosPut(fileUrl("Pages/Guide.md"), {
            path: "Pages/Guide.md",
            nodeKey: "node-1",
            assetType: "MARKDOWN_FILE",
            eTag: eTag("file-3"),
        });
        mockManifest([{ nodeKey: "node-1", path: "Pages/Guide.md", content: "changed" }]);

        await service.push();

        expect(mockedAxiosInstance.patch).toHaveBeenCalledWith(
            fileUrl("Guides/Guide.md"),
            JSON.stringify({ targetPath: "Pages/Guide.md" }),
            expect.objectContaining({ headers: expect.objectContaining({ "If-Match": eTag("file-1") }) })
        );
        expect(mockedAxiosInstance.put).toHaveBeenCalledWith(
            fileUrl("Pages/Guide.md"),
            Buffer.from("changed"),
            expect.objectContaining({ headers: expect.objectContaining({ "If-Match": eTag("file-2") }) })
        );
        expect((mockedAxiosInstance.patch as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
            (mockedAxiosInstance.put as jest.Mock).mock.invocationCallOrder[0]
        );
        expect(service.status()).toEqual([]);
    });

    it("moves a tracked file before creating a replacement at its old path", async () => {
        writeWorkspace();
        const service = new WorkspaceService(testContext);
        service.move("Guides/Guide.md", "Pages/Guide.md");
        fs.writeFileSync(path.join(process.cwd(), "Guides/Guide.md"), "replacement");
        expect(service.status()).toEqual([
            { path: "Guides/Guide.md", status: "added" },
            { path: "Pages/Guide.md", status: "moved" },
        ]);
        mockAxiosGet(fileUrl("Guides/Guide.md"), Buffer.from("original"), { etag: eTag("file-1") });
        mockAxiosPatch(fileUrl("Guides/Guide.md"), {
            path: "Pages/Guide.md",
            nodeKey: "node-1",
            assetType: "MARKDOWN_FILE",
            eTag: eTag("file-2"),
        });
        mockAxiosPut(fileUrl("Guides/Guide.md"), {
            path: "Guides/Guide.md",
            nodeKey: "node-2",
            assetType: "MARKDOWN_FILE",
            eTag: eTag("file-3"),
        });
        mockManifest([
            { nodeKey: "node-1", path: "Pages/Guide.md", content: "original" },
            { nodeKey: "node-2", path: "Guides/Guide.md", content: "replacement" },
        ]);

        await service.push();

        expect((mockedAxiosInstance.patch as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
            (mockedAxiosInstance.put as jest.Mock).mock.invocationCallOrder[0]
        );
        expect(service.status()).toEqual([]);
    });

    it("refreshes after a moved file is relocated but its content update fails", async () => {
        writeWorkspace();
        const service = new WorkspaceService(testContext);
        service.move("Guides/Guide.md", "Pages/Guide.md");
        fs.writeFileSync(path.join(process.cwd(), "Pages/Guide.md"), "changed");
        mockAxiosGet(fileUrl("Guides/Guide.md"), Buffer.from("original"), { etag: eTag("file-1") });
        mockAxiosPatch(fileUrl("Guides/Guide.md"), {
            path: "Pages/Guide.md",
            nodeKey: "node-1",
            assetType: "MARKDOWN_FILE",
            eTag: eTag("file-2"),
        });
        mockAxiosPutError(fileUrl("Pages/Guide.md"), 412, { message: "stale" });
        mockManifest([{ nodeKey: "node-1", path: "Pages/Guide.md", content: "original" }]);

        await expect(service.push()).rejects.toThrow("Workspace push failed for 1 file(s)");

        expect(service.status()).toEqual([{ path: "Pages/Guide.md", status: "modified" }]);
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman/local/state.json"), "utf-8"))
        ).toMatchObject({
            baselineDigests: { "node-1": digest("original") },
            moveHints: {},
        });
    });

    it("rejects paths with a full push and overwrite without a full push", async () => {
        writeWorkspace();

        await expect(new WorkspaceService(testContext).push(["Guides"], { full: true })).rejects.toThrow(
            "Workspace paths cannot be combined with --full"
        );
        await expect(new WorkspaceService(testContext).push([], { overwrite: true })).rejects.toThrow(
            "--overwrite requires --full"
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
        mockAxiosGet(ARCHIVE_URL, archive([{ nodeKey: "node-1", path: "Pages/Guide.md", content: "changed" }]), {
            etag: eTag("revision-2"),
        });

        try {
            await service.push([], { full: true, overwrite: true });
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
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toEqual({
            schemaVersion: 1,
            activePackageKey: PACKAGE_KEY,
            activeBranch: "main",
            serverRevision: eTag("revision-2"),
            baselineDigests: { "node-1": digest("changed") },
            moveHints: {},
        });
    });

    it("replaces the workspace on full pull when post-push refresh fails", async () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides", "Guide.md"), path.join(process.cwd(), "Pages", "Guide.md"));
        mockAxiosPost(PUSH_URL, {});
        mockAxiosGetError(ARCHIVE_URL, 503, { message: "unavailable" });
        const service = new WorkspaceService(testContext);

        await expect(service.push([], { full: true })).rejects.toThrow(
            "Push succeeded, but local state refresh failed"
        );
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toMatchObject({ refreshRequired: true });
        expect(() => service.status()).toThrow("Workspace synchronization state needs refresh");

        mockAxiosGet(ARCHIVE_URL, archive([{ nodeKey: "node-1", path: "Pages/Guide.md", content: "original" }]), {
            etag: eTag("revision-2"),
        });
        await service.pull([], { full: true });
        expect(service.status()).toEqual([]);
        expect(fs.existsSync(path.join(process.cwd(), "Guides", "Guide.md"))).toBe(false);
        expect(fs.readFileSync(path.join(process.cwd(), "Pages", "Guide.md"), "utf-8")).toBe("original");
    });

    it("clears an applied move hint when an incremental push refresh is recovered by pull", async () => {
        writeWorkspace();
        fs.mkdirSync(path.join(process.cwd(), "Pages"));
        fs.renameSync(path.join(process.cwd(), "Guides", "Guide.md"), path.join(process.cwd(), "Pages", "Guide.md"));
        const service = new WorkspaceService(testContext);
        service.move("Guides/Guide.md", "Pages/Guide.md", true);
        mockAxiosGet(fileUrl("Guides/Guide.md"), Buffer.from("original"), { etag: eTag("file-1") });
        mockAxiosPatch(fileUrl("Guides/Guide.md"), {
            path: "Pages/Guide.md",
            nodeKey: "node-1",
            assetType: "MARKDOWN_FILE",
            eTag: eTag("file-2"),
        });
        mockAxiosGetError(manifestUrl(), 503, { message: "unavailable" });

        await expect(service.push()).rejects.toThrow("local synchronization state could not be refreshed");

        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toMatchObject({ refreshRequired: true, moveHints: {} });
        mockManifest([{ nodeKey: "node-1", path: "Pages/Guide.md", content: "original" }]);
        await service.pull();

        expect(service.status()).toEqual([]);
        expect(
            JSON.parse(fs.readFileSync(path.join(process.cwd(), ".pacman", "local", "state.json"), "utf-8"))
        ).toMatchObject({ moveHints: {} });
    });

    it("preserves the metadata backup when refresh and rollback both fail", async () => {
        writeWorkspace();
        fs.writeFileSync(path.join(process.cwd(), "Guides", "Guide.md"), "changed");
        mockAxiosPost(PUSH_URL, {});
        mockAxiosGet(ARCHIVE_URL, archive([{ nodeKey: "node-1", path: "Guides/Guide.md", content: "changed" }]), {
            etag: eTag("revision-2"),
        });
        const originalRename = fs.renameSync;
        const rename = jest.spyOn(fs, "renameSync").mockImplementation((source, target) => {
            if (target.toString() === path.join(process.cwd(), ".pacman")) {
                throw new Error("rename failed");
            }
            originalRename(source, target);
        });
        let backup: string | undefined;

        try {
            await new WorkspaceService(testContext).push([], { full: true });
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            const match = (error as Error).message.match(
                /backup remains at (.+?)\. Run workspace pull before retrying\.$/
            );
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

        await expect(new WorkspaceService(testContext).push()).rejects.toThrow("Workspace push failed for 1 file(s)");
        expect(mockedAxiosInstance.post).not.toHaveBeenCalled();
    });

    it("reserves the metadata directory case-insensitively", () => {
        writeWorkspace();

        expect(() => new WorkspaceService(testContext).move("Guides/Guide.md", ".PACMAN/Guide.md")).toThrow(
            "Invalid workspace path"
        );
    });
});
