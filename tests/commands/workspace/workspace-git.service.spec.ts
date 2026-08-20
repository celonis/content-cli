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

    it("observes the current Git branch and HEAD", () => {
        const observation = new WorkspaceGitService().observe(workspace);

        expect(observation).toEqual({ branch: "main", head: git("rev-parse", "HEAD") });
    });

    it("stores explicit mappings scoped to the workspace and project", () => {
        const service = new WorkspaceGitService();

        expect(service.link(workspace, "project-a", "main", "feature-a")).toEqual({
            branch: "main",
            head: git("rev-parse", "HEAD"),
        });
        expect(service.mappedPacmanBranch(workspace, "project-a", "main")).toBe("feature-a");
        expect(service.mappedPacmanBranch(workspace, "project-b", "main")).toBeUndefined();
        expect(service.mappedPacmanBranch(repository, "project-a", "main")).toBeUndefined();
    });

    it("reports detached HEAD without changing Git state", () => {
        const head = git("rev-parse", "HEAD");
        git("checkout", "--detach", head);

        expect(new WorkspaceGitService().observe(workspace)).toEqual({ branch: "", head });
    });

    it("returns no observation outside a Git worktree", () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "content-cli-workspace-no-git-"));
        try {
            expect(new WorkspaceGitService().observe(directory)).toBeUndefined();
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });

    function git(...args: string[]): string {
        return execFileSync("git", ["-C", repository, ...args], {
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    }
});
