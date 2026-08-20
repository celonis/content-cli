import { createHash } from "node:crypto";
import * as path from "node:path";
import simpleGit from "simple-git";
import { GracefulError } from "../../core/utils/logger";
import { WorkspaceGitObservation } from "./workspace.models";

interface GitContext extends WorkspaceGitObservation {
    root: string;
}

export class WorkspaceGitService {
    public async observe(workspaceRoot: string): Promise<WorkspaceGitObservation | undefined> {
        const context = await this.context(workspaceRoot);
        return context ? { branch: context.branch, head: context.head } : undefined;
    }

    public async mappedPacmanBranch(
        workspaceRoot: string,
        projectKey: string,
        gitBranch: string
    ): Promise<string | undefined> {
        const context = await this.context(workspaceRoot);
        if (!context) {
            return undefined;
        }
        return (await this.mappings(context.root, workspaceRoot, projectKey))[gitBranch];
    }

    public async link(
        workspaceRoot: string,
        projectKey: string,
        gitBranch: string,
        pacmanBranch: string
    ): Promise<WorkspaceGitObservation> {
        const context = await this.context(workspaceRoot);
        if (!context) {
            throw new GracefulError("Workspace is not inside a Git worktree.");
        }
        if (context.branch !== gitBranch) {
            throw new GracefulError("Git branch changed while linking the workspace.");
        }
        const mappings = await this.mappings(context.root, workspaceRoot, projectKey);
        mappings[gitBranch] = pacmanBranch;
        await this.run(context.root, [
            "config",
            "--local",
            this.mappingKey(context.root, workspaceRoot, projectKey),
            JSON.stringify(mappings),
        ]);
        return { branch: context.branch, head: context.head };
    }

    private async context(workspaceRoot: string): Promise<GitContext | undefined> {
        const gitRoot = await this.tryRun(workspaceRoot, ["rev-parse", "--show-toplevel"]);
        if (!gitRoot) {
            return undefined;
        }
        const head = await this.tryRun(gitRoot, ["rev-parse", "HEAD"]);
        if (!head) {
            return undefined;
        }
        const branch = await this.tryRun(gitRoot, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
        return { root: path.resolve(gitRoot), branch: branch || "", head };
    }

    private async mappings(
        gitRoot: string,
        workspaceRoot: string,
        projectKey: string
    ): Promise<Record<string, string>> {
        const raw = await this.tryRun(gitRoot, [
            "config",
            "--local",
            "--get",
            this.mappingKey(gitRoot, workspaceRoot, projectKey),
        ]);
        if (!raw) {
            return {};
        }
        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            if (
                !parsed ||
                typeof parsed !== "object" ||
                Array.isArray(parsed) ||
                !Object.values(parsed).every(value => typeof value === "string")
            ) {
                throw new Error("Invalid workspace mapping value.");
            }
            return parsed as Record<string, string>;
        } catch {
            throw new GracefulError("Git contains an invalid Content CLI workspace mapping.");
        }
    }

    private mappingKey(gitRoot: string, workspaceRoot: string, projectKey: string): string {
        const relativeRoot = path.relative(gitRoot, workspaceRoot).split(path.sep).join("/") || ".";
        const id = createHash("sha256").update(`${projectKey}\0${relativeRoot}`).digest("hex").slice(0, 16);
        return `content-cli-workspace.${id}.mappings`;
    }

    private async tryRun(root: string, args: string[]): Promise<string | undefined> {
        try {
            return await this.run(root, args);
        } catch {
            return undefined;
        }
    }

    private async run(root: string, args: string[]): Promise<string> {
        return (await simpleGit({ baseDir: root }).raw(args)).trim();
    }
}
