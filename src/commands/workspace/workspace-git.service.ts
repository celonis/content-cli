import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { GracefulError } from "../../core/utils/logger";
import { WorkspaceGitObservation } from "./workspace.models";

interface GitContext extends WorkspaceGitObservation {
    root: string;
}

export class WorkspaceGitService {
    public observe(workspaceRoot: string): WorkspaceGitObservation | undefined {
        const context = this.context(workspaceRoot);
        return context ? { branch: context.branch, head: context.head } : undefined;
    }

    public mappedPacmanBranch(workspaceRoot: string, projectKey: string, gitBranch: string): string | undefined {
        const context = this.context(workspaceRoot);
        if (!context) {
            return undefined;
        }
        return this.mappings(context.root, workspaceRoot, projectKey)[gitBranch];
    }

    public link(
        workspaceRoot: string,
        projectKey: string,
        gitBranch: string,
        pacmanBranch: string
    ): WorkspaceGitObservation {
        const context = this.context(workspaceRoot);
        if (!context) {
            throw new GracefulError("Workspace is not inside a Git worktree.");
        }
        if (context.branch !== gitBranch) {
            throw new GracefulError("Git branch changed while linking the workspace.");
        }
        const mappings = this.mappings(context.root, workspaceRoot, projectKey);
        mappings[gitBranch] = pacmanBranch;
        this.run(context.root, [
            "config",
            "--local",
            this.mappingKey(context.root, workspaceRoot, projectKey),
            JSON.stringify(mappings),
        ]);
        return { branch: context.branch, head: context.head };
    }

    private context(workspaceRoot: string): GitContext | undefined {
        const gitRoot = this.tryRun(workspaceRoot, ["rev-parse", "--show-toplevel"]);
        if (!gitRoot) {
            return undefined;
        }
        const head = this.tryRun(gitRoot, ["rev-parse", "HEAD"]);
        if (!head) {
            return undefined;
        }
        const branch = this.tryRun(gitRoot, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
        return { root: path.resolve(gitRoot), branch: branch || "", head };
    }

    private mappings(gitRoot: string, workspaceRoot: string, projectKey: string): Record<string, string> {
        const raw = this.tryRun(gitRoot, [
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
                throw new Error();
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

    private tryRun(root: string, args: string[]): string | undefined {
        try {
            return this.run(root, args);
        } catch {
            return undefined;
        }
    }

    private run(root: string, args: string[]): string {
        return execFileSync("git", ["-C", root, ...args], {
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    }
}
