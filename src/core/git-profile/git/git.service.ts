import simpleGit from "simple-git";
import { logger } from "../../utils/logger";
import * as fs from "fs";
import * as path from "path";
import * as os from "node:os";
import { Context } from "../../command/cli-context";
import { v4 as uuid } from "uuid";
import { SimpleGit } from "simple-git/dist/typings/simple-git";
import { GitProfile } from "../git-profile.interface";

export class GitService {

    private readonly gitProfile: GitProfile;

    constructor(context: Context) {
        this.gitProfile = context.gitProfile;
    }

    public async pullFromBranch(branch: string): Promise<string> {
        this.validateGitProfileExistence();
        const repoUrl = this.getRepoUrl();

        const targetDir = path.join(os.tmpdir(), `content-cli-${uuid()}`);
        fs.mkdirSync(targetDir, { recursive: true });

        const git = simpleGit();
        try {
            await git.clone(repoUrl, targetDir, ["--branch", branch, "--single-branch"]);
        } catch (err) {
            throw new Error(`Failed to pull from ${branch}: ${err}`);
        }
        this.cleanupGitDirectory(targetDir);
        return targetDir;
    }

    public async pushToBranch(sourceDir: string, branch: string): Promise<void> {
        this.validateGitProfileExistence();

        const workingDir = path.join(os.tmpdir(), `content-cli-${uuid()}`);
        fs.mkdirSync(workingDir, { recursive: true });

        const repoUrl = this.getRepoUrl();
        const git = simpleGit();

        try {
            await git.clone(repoUrl, workingDir, ["--branch", "main"]);
            const repoGit = simpleGit({ baseDir: workingDir });

            await repoGit.addConfig("user.name", this.gitProfile.username ?? "content-cli");
            await repoGit.addConfig("user.email", `${this.gitProfile.username ?? "cli"}@users.noreply.github.com`);

            await this.cleanupNonGitFiles(workingDir);
            await this.checkoutOrCreateLocalBranch(repoGit, branch);

            fs.cpSync(sourceDir, workingDir, { recursive: true });

            await repoGit.add("./*");
            const status = await repoGit.status();
            if (status.files.length === 0) {
                logger.debug("No changes to commit.");
                return;
            }

            const commitMessage = "Update from content-cli";
            await repoGit.commit(commitMessage);

            await repoGit.push(["--set-upstream", "origin", branch]);
        } catch (err) {
            throw new Error(`Failed to push to ${branch}: ${err}`);
        } finally {
            fs.rmSync(workingDir, { recursive: true, force: true });
        }
    }

    private async cleanupNonGitFiles(workingDir: string): Promise<void> {
        for (const entry of fs.readdirSync(workingDir)) {
            if (entry !== ".git") {
                fs.rmSync(path.join(workingDir, entry), { recursive: true, force: true });
            }
        }
    }

    private async checkoutOrCreateLocalBranch(git: SimpleGit, branch: string): Promise<void> {
        const branches = await git.branch();

        if (!branches.all.includes(`remotes/origin/${branch}`)) {
            await git.checkoutLocalBranch(branch);
        } else {
            await git.checkout(["-b", branch, "--track", `origin/${branch}`]);
        }
    }

    private getRepoUrl(): string {
        const { authenticationType, repository } = this.gitProfile;

        if (authenticationType === "SSH") {
            return `git@github.com:${repository}.git`;
        }

        return `https://github.com/${repository}.git`;
    }

    private cleanupGitDirectory(repoDirectory: string): void {
        const gitPath = path.join(repoDirectory, ".git");

        if (fs.existsSync(gitPath)) {
            fs.rmSync(gitPath, { recursive: true, force: true });
        }
    }

    private validateGitProfileExistence(): void {
        if (!this.gitProfile) {
            throw new Error("No configured Git profile.");
        }
    }
}
