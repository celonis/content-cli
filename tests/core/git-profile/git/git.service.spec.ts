import * as fs from "fs";
import * as path from "path";
import * as os from "node:os";
import { GitService } from "../../../../src/core/git-profile/git/git.service";
import { Context } from "../../../../src/core/command/cli-context";
import { GitProfile } from "../../../../src/core/git-profile/git-profile.interface";
import simpleGit from "simple-git";

jest.mock("simple-git");
jest.mock("fs");
jest.mock("path");
jest.mock("node:os");
jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid-1234"),
}));

const mockSimpleGit = simpleGit as jest.MockedFunction<typeof simpleGit>;

describe("GitService", () => {
  let gitService: GitService;
  let mockContext: Context;
  let mockGitProfile: GitProfile;
  let mockGit: any;

  const mockTargetDir = "/tmp/content-cli-test-uuid-1234";

  beforeEach(() => {
    jest.clearAllMocks();

    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.rmSync as jest.Mock).mockImplementation(() => {});
    (fs.cpSync as jest.Mock).mockImplementation(() => {});
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue([
      ".git",
      "file1.txt",
      "file2.txt",
    ]);

    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
    (os.tmpdir as jest.Mock).mockReturnValue("/tmp");

    mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      push: jest.fn().mockResolvedValue(undefined),
      addConfig: jest.fn().mockResolvedValue(undefined),
      status: jest.fn().mockResolvedValue({ files: [{ path: "test.txt" }] }),
      branch: jest.fn().mockResolvedValue({ current: "main", all: ["main"] }),
      checkout: jest.fn().mockResolvedValue(undefined),
      checkoutLocalBranch: jest.fn().mockResolvedValue(undefined),
    };

    mockSimpleGit.mockReturnValue(mockGit);

    mockGitProfile = {
      name: "test-profile",
      authenticationType: "HTTPS",
      repository: "test-org/test-repo",
      username: "testuser",
      token: "test-token",
    };

    mockContext = {
      gitProfile: mockGitProfile,
    } as Context;

    gitService = new GitService(mockContext);
  });

  describe("pullFromBranch", () => {
    it("should successfully pull from a branch with HTTPS authentication", async () => {
      const branch = "feature/test-branch";

      const result = await gitService.pullFromBranch(branch);

      assertHttpsCloneWithCredentials(
        branch,
        mockTargetDir,
        "testuser",
        "test-token",
        "test-org/test-repo",
      );
      assertDirectoryCreated(mockTargetDir);
      assertGitDirectoryCleanup("/tmp/content-cli-test-uuid-1234");
      expect(result).toBe(mockTargetDir);
    });

    it("should successfully pull from a branch with SSH authentication", async () => {
      mockGitProfile.authenticationType = "SSH";
      gitService = new GitService(mockContext);

      const branch = "main";

      const result = await gitService.pullFromBranch(branch);

      assertSshClone(branch, mockTargetDir, "test-org/test-repo");
      expect(result).toBe(mockTargetDir);
    });

    it("should handle clone failure", async () => {
      const branch = "non-existent-branch";
      const errorMessage = "Repository not found";
      mockGit.clone.mockRejectedValue(new Error(errorMessage));

      await expect(gitService.pullFromBranch(branch)).rejects.toThrow(
        `Failed to pull from ${branch}: Error: ${errorMessage}`,
      );
    });

    it("should throw error when git profile is not configured", async () => {
      const contextWithoutGitProfile = { gitProfile: null } as Context;
      const serviceWithoutProfile = new GitService(contextWithoutGitProfile);

      await expect(
        serviceWithoutProfile.pullFromBranch("main"),
      ).rejects.toThrow("No configured Git profile.");
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
        branches: {},
      });

      await gitService.pushToBranch(sourceDir, branch);

      assertDirectoryCreated(workingDir);
      assertHttpsCloneForPush(
        workingDir,
        "testuser",
        "test-token",
        "test-org/test-repo",
      );
      assertGitCredentialsConfigured("testuser");
      assertBranchCreatedAndCheckedOut(branch);
      assertSourceCopiedToWorkingDirectory(sourceDir, workingDir);
      assertFilesCommittedAndPushed(branch);
      assertWorkingDirectoryCleanup(workingDir);
    });

    it("should push even when there are no changes", async () => {
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
        isClean: () => true,
      });

      await gitService.pushToBranch(sourceDir, branch);
      assertFilesCommittedAndPushed(branch);
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
        expect.any(Array),
      );
    });

    it("should generate HTTPS URL without token", async () => {
      mockGitProfile.token = undefined;
      gitService = new GitService(mockContext);

      await gitService.pullFromBranch("main");

      expect(mockGit.clone).toHaveBeenCalledWith(
        "https://github.com/test-org/test-repo.git",
        expect.any(String),
        expect.any(Array),
      );
    });
  });

  describe("error handling", () => {
    it("should throw error when git profile is missing", async () => {
      const contextWithoutProfile = { gitProfile: null } as Context;
      const serviceWithoutProfile = new GitService(contextWithoutProfile);

      await expect(
        serviceWithoutProfile.pullFromBranch("main"),
      ).rejects.toThrow("No configured Git profile.");
    });
  });

  const assertDirectoryCreated = (directory: string) => {
    expect(fs.mkdirSync).toHaveBeenCalledWith(directory, { recursive: true });
  };

  const assertGitDirectoryCleanup = (directory: string) => {
    expect(fs.rmSync).toHaveBeenCalledWith(`${directory}/.git`, {
      recursive: true,
      force: true,
    });
  };

  const assertWorkingDirectoryCleanup = (directory: string) => {
    expect(fs.rmSync).toHaveBeenCalledWith(directory, {
      recursive: true,
      force: true,
    });
  };

  const assertHttpsCloneWithCredentials = (
    branch: string,
    targetDir: string,
    username: string,
    token: string,
    repository: string,
  ) => {
    expect(mockGit.clone).toHaveBeenCalledWith(
      `https://${username}:${token}@github.com/${repository}.git`,
      targetDir,
      ["--branch", branch, "--single-branch"],
    );
  };

  const assertHttpsCloneForPush = (
    targetDir: string,
    username: string,
    token: string,
    repository: string,
  ) => {
    expect(mockGit.clone).toHaveBeenCalledWith(
      `https://${username}:${token}@github.com/${repository}.git`,
      targetDir,
    );
  };

  const assertSshClone = (
    branch: string,
    targetDir: string,
    repository: string,
  ) => {
    expect(mockGit.clone).toHaveBeenCalledWith(
      `git@github.com:${repository}.git`,
      targetDir,
      ["--branch", branch, "--single-branch"],
    );
  };

  const assertGitCredentialsConfigured = (username: string) => {
    expect(mockGit.addConfig).toHaveBeenCalledWith("user.name", username);
    expect(mockGit.addConfig).toHaveBeenCalledWith(
      "user.email",
      `${username}@users.noreply.github.com`,
    );
  };

  const assertBranchCreatedAndCheckedOut = (branch: string) => {
    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith(branch);
  };

  const assertFilesCommittedAndPushed = (
    branch: string,
    commitMessage: string = "Update from content-cli",
  ) => {
    expect(mockGit.add).toHaveBeenCalledWith("./*");
    expect(mockGit.commit).toHaveBeenCalledWith(commitMessage);
    expect(mockGit.push).toHaveBeenCalledWith([
      "--set-upstream",
      "origin",
      branch,
    ]);
  };

  const assertSourceCopiedToWorkingDirectory = (
    sourceDir: string,
    workingDir: string,
  ) => {
    expect(fs.cpSync).toHaveBeenCalledWith(sourceDir, workingDir, {
      recursive: true,
    });
  };
});
