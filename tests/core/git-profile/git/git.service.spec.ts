import * as fs from "fs";
import * as path from "path";
import * as os from "node:os";
import { GitService } from "../../../../src/core/git-profile/git/git.service";
import { Context } from "../../../../src/core/command/cli-context";
import { GitProfile } from "../../../../src/core/git-profile/git-profile.interface";
import simpleGit, { SimpleGit } from "simple-git";

jest.mock("simple-git");
jest.mock("fs");
jest.mock("path");
jest.mock("node:os");
jest.mock("uuid", () => ({
    v4: jest.fn(() => "test-uuid-1234")
}));

describe("GitService", () => {
    let gitService: GitService;
    let mockContext: Context;
    let mockGit: jest.Mocked<SimpleGit>;
    let mockGitProfile: GitProfile;

    const mockTargetDir = "/tmp/content-cli-test-uuid-1234";

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock fs functions
        (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
        (fs.rmSync as jest.Mock).mockImplementation(() => {});
        (fs.cpSync as jest.Mock).mockImplementation(() => {});
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readdirSync as jest.Mock).mockReturnValue([".git", "file1.txt", "file2.txt"]);

        // Mock path and os functions
        (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
        (os.tmpdir as jest.Mock).mockReturnValue("/tmp");

        // Mock SimpleGit
        mockGit = {
            clone: jest.fn().mockResolvedValue(undefined),
            add: jest.fn().mockResolvedValue(undefined),
            commit: jest.fn().mockResolvedValue(undefined),
            push: jest.fn().mockResolvedValue(undefined),
            addConfig: jest.fn().mockResolvedValue(undefined),
            status: jest.fn().mockResolvedValue({
                files: [{ path: "test.txt" }],
                not_added: [],
                conflicted: [],
                created: [],
                deleted: [],
                modified: [],
                renamed: [],
                ahead: 0,
                behind: 0,
                current: "main",
                tracking: null,
                staged: [],
                detached: false,
                isClean: () => false
            }),
            branch: jest.fn().mockResolvedValue({
                current: "main",
                all: ["main", "remotes/origin/main"],
                detached: false,
                branches: {}
            }),
            checkout: jest.fn().mockResolvedValue(undefined),
            checkoutLocalBranch: jest.fn().mockResolvedValue(undefined)
        } as any;

        (simpleGit as jest.Mock).mockImplementation(() => mockGit);

        // Setup mock git profile
        mockGitProfile = {
            name: "test-profile",
            authenticationType: "HTTPS",
            repository: "test-org/test-repo",
            username: "testuser",
            token: "test-token"
        };

        // Setup mock context
        mockContext = {
            gitProfile: mockGitProfile
        } as Context;

        gitService = new GitService(mockContext);
    });

    describe("pullFromBranch", () => {
        it("should successfully pull from a branch with HTTPS authentication", async () => {
            const branch = "feature/test-branch";

            const result = await gitService.pullFromBranch(branch);

            expect(mockGit.clone).toHaveBeenCalledWith(
                "https://testuser:test-token@github.com/test-org/test-repo.git",
                mockTargetDir,
                ["--branch", branch, "--single-branch"]
            );
            expect(fs.mkdirSync).toHaveBeenCalledWith(mockTargetDir, { recursive: true });
            expect(fs.rmSync).toHaveBeenCalledWith("/tmp/content-cli-test-uuid-1234/.git", {
                recursive: true,
                force: true
            });
            expect(result).toBe(mockTargetDir);
        });

        it("should successfully pull from a branch with SSH authentication", async () => {
            mockGitProfile.authenticationType = "SSH";
            gitService = new GitService(mockContext);

            const branch = "main";

            const result = await gitService.pullFromBranch(branch);

            expect(mockGit.clone).toHaveBeenCalledWith(
                "git@github.com:test-org/test-repo.git",
                mockTargetDir,
                ["--branch", branch, "--single-branch"]
            );
            expect(result).toBe(mockTargetDir);
        });

        it("should handle clone failure", async () => {
            const branch = "non-existent-branch";
            const errorMessage = "Repository not found";
            mockGit.clone.mockRejectedValue(new Error(errorMessage));

            await expect(gitService.pullFromBranch(branch)).rejects.toThrow(
                `Failed to pull from ${branch}: Error: ${errorMessage}`
            );
        });

        it("should throw error when git profile is not configured", async () => {
            const contextWithoutGitProfile = { gitProfile: null } as Context;
            const serviceWithoutProfile = new GitService(contextWithoutGitProfile);

            await expect(serviceWithoutProfile.pullFromBranch("main")).rejects.toThrow(
                "No configured Git profile."
            );
        });
    });

    describe("pushToBranch", () => {
        const sourceDir = "/source/directory";
        const branch = "feature/new-feature";
        const workingDir = "/tmp/content-cli-test-uuid-1234";

        it("should successfully push to a new branch", async () => {
            mockGit.branch.mockResolvedValue({
                current: "main",
                all: ["main"],
                detached: false,
                branches: {}
            });

            await gitService.pushToBranch(sourceDir, branch);

            expect(fs.mkdirSync).toHaveBeenCalledWith(workingDir, { recursive: true });
            expect(mockGit.clone).toHaveBeenCalledWith("https://testuser:test-token@github.com/test-org/test-repo.git", workingDir);
            expect(mockGit.addConfig).toHaveBeenCalledWith("user.name", "testuser");
            expect(mockGit.addConfig).toHaveBeenCalledWith("user.email", "testuser@users.noreply.github.com");
            expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith(branch);
            expect(fs.cpSync).toHaveBeenCalledWith(sourceDir, workingDir, { recursive: true });
            expect(mockGit.add).toHaveBeenCalledWith("./*");
            expect(mockGit.commit).toHaveBeenCalledWith("Update from content-cli");
            expect(mockGit.push).toHaveBeenCalledWith(["--set-upstream", "origin", branch]);
            expect(fs.rmSync).toHaveBeenCalledWith(workingDir, { recursive: true, force: true });
        });

        it("should not commit when there are no changes", async () => {
            mockGit.status.mockResolvedValue({
                files: [],
                not_added: [],
                conflicted: [],
                created: [],
                deleted: [],
                modified: [],
                renamed: [],
                ahead: 0,
                behind: 0,
                current: "main",
                tracking: null,
                staged: [],
                detached: false,
                isClean: () => true
            });

            await gitService.pushToBranch(sourceDir, branch);

            expect(mockGit.commit).not.toHaveBeenCalled();
            expect(mockGit.push).not.toHaveBeenCalled();
        });
    });

    describe("URL generation", () => {
        it("should generate SSH URL correctly", async () => {
            mockGitProfile.authenticationType = "SSH";
            gitService = new GitService(mockContext);

            await gitService.pullFromBranch("main");

            expect(mockGit.clone).toHaveBeenCalledWith(
                "git@github.com:test-org/test-repo.git",
                expect.any(String),
                expect.any(Array)
            );
        });

        it("should generate HTTPS URL without token", async () => {
            mockGitProfile.token = undefined;
            gitService = new GitService(mockContext);

            await gitService.pullFromBranch("main");

            expect(mockGit.clone).toHaveBeenCalledWith(
                "https://github.com/test-org/test-repo.git",
                expect.any(String),
                expect.any(Array)
            );
        });
    });

    describe("error handling", () => {
        it("should throw error when git profile is missing", async () => {
            const contextWithoutProfile = { gitProfile: null } as Context;
            const serviceWithoutProfile = new GitService(contextWithoutProfile);

            await expect(serviceWithoutProfile.pullFromBranch("main")).rejects.toThrow(
                "No configured Git profile."
            );
        });
    });
});
