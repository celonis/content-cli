import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { WorkspaceGitService } from "../../../src/commands/workspace/workspace-git.service";

describe("Workspace Git service", () => {
    let repository: string;
    let workspace: string;

    beforeEach(() => {
        repository = fs.mkdtempSync(path.join(os.tmpdir(), "content-cli-workspace-git-"));
        workspace = path.join(repository, "content");
        fs.mkdirSync(workspace);
        git("init", "-b", "main");
        git("config", "user.email", "workspace-tests@example.invalid");
        git("config", "user.name", "Workspace Tests");
        git("-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "initial");
    });

    afterEach(() => fs.rmSync(repository, { recursive: true, force: true }));

    it("observes the current Git branch and HEAD", async () => {
        const observation = await new WorkspaceGitService().observe(workspace);

        expect(observation).toEqual({ branch: "main", head: git("rev-parse", "HEAD") });
    });

    it("stores explicit mappings scoped to the workspace and project", async () => {
        const service = new WorkspaceGitService();

        await expect(service.link(workspace, "project-a", "main", "feature-a")).resolves.toEqual({
            branch: "main",
            head: git("rev-parse", "HEAD"),
        });
        await expect(service.mappedPacmanBranch(workspace, "project-a", "main")).resolves.toBe("feature-a");
        await expect(service.mappedPacmanBranch(workspace, "project-b", "main")).resolves.toBeUndefined();
        await expect(service.mappedPacmanBranch(repository, "project-a", "main")).resolves.toBeUndefined();
    });

    it("reports detached HEAD without changing Git state", async () => {
        const head = git("rev-parse", "HEAD");
        git("checkout", "--detach", head);

        await expect(new WorkspaceGitService().observe(workspace)).resolves.toEqual({ branch: "", head });
    });

    it("rejects linking after the Git branch changes", async () => {
        await expect(new WorkspaceGitService().link(workspace, "project-a", "other", "feature-a")).rejects.toThrow(
            "Git branch changed while linking the workspace."
        );
    });

    it("rejects an invalid stored mapping", async () => {
        const service = new WorkspaceGitService();
        await service.link(workspace, "project-a", "main", "feature-a");
        const mappingKey = git("config", "--local", "--name-only", "--get-regexp", "^content-cli-workspace\\.");
        git("config", "--local", mappingKey, "[]");

        await expect(service.mappedPacmanBranch(workspace, "project-a", "main")).rejects.toThrow(
            "Git contains an invalid Content CLI workspace mapping."
        );
    });

    it("returns no observation before a repository has a HEAD", async () => {
        const emptyRepository = fs.mkdtempSync(path.join(os.tmpdir(), "content-cli-workspace-empty-git-"));
        gitIn(emptyRepository, "init", "-b", "main");
        try {
            await expect(new WorkspaceGitService().observe(emptyRepository)).resolves.toBeUndefined();
        } finally {
            fs.rmSync(emptyRepository, { recursive: true, force: true });
        }
    });

    it("returns no observation outside a Git worktree", async () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "content-cli-workspace-no-git-"));
        try {
            await expect(new WorkspaceGitService().observe(directory)).resolves.toBeUndefined();
            await expect(
                new WorkspaceGitService().mappedPacmanBranch(directory, "project-a", "main")
            ).resolves.toBeUndefined();
            await expect(new WorkspaceGitService().link(directory, "project-a", "main", "feature-a")).rejects.toThrow(
                "Workspace is not inside a Git worktree."
            );
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });

    function git(...args: string[]): string {
        return gitIn(repository, ...args);
    }

    function gitIn(directory: string, ...args: string[]): string {
        return execFileSync("git", ["-C", directory, ...args], {
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    }
});
