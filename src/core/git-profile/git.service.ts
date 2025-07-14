import { GitProfile } from "./git-profile.interface";
import simpleGit from "simple-git";
import { logger } from "../utils/logger";
import * as fs from "fs";
import * as path from "path";
import * as os from "node:os";
import { Context } from "../command/cli-context";
import { v4 as uuid } from "uuid";
import { SimpleGit } from "simple-git/dist/typings/simple-git";

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
        const repoUrl = this.getRepoUrl();
        const git = simpleGit({ baseDir: sourceDir });

        try {
            if (!fs.existsSync(path.join(sourceDir, ".git"))) {
                await git.init();
                await git.addRemote("origin", repoUrl);
            }

            await git.addConfig("user.name", this.gitProfile.username ?? "content-cli");
            await git.addConfig("user.email", `${this.gitProfile.username ?? "cli"}@users.noreply.github.com`);

            await this.checkoutOrCreateLocalBranch(git, branch);
            await git.add("./*");
            const status = await git.status();
            if (status.files.length === 0) {
                logger.debug("No changes to commit.");
                return;
            }

            const commitMessage = "Update from content-cli";
            await git.commit(commitMessage);
            await git.push(["-u", "--force", "origin", branch]);
        } catch (err) {
            throw new Error(`Failed to push to ${branch}: ${err}`);
        }
    }

    private async checkoutOrCreateLocalBranch(git: SimpleGit, branch: string): Promise<void> {
        const branches = await git.branch();

        if (!branches.all.includes(branch)) {
            await git.checkoutLocalBranch(branch);
        } else {
            await git.checkout(branch);
        }
    }

    private getRepoUrl(): string {
        const { authenticationType, repository, token, username } = this.gitProfile;

        if (authenticationType === "SSH") {
            return `git@github.com:${repository}.git`;
        }

        const safeUsername = encodeURIComponent(username ?? "git");
        const safeToken = encodeURIComponent(token);
        return `https://${safeUsername}:${safeToken}@github.com/${repository}.git`;
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
