import { GitProfileCommandService } from "../../../src/commands/git-profile/git-profile-command.service";
import { loggingTestTransport } from "../../jest.setup";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

jest.mock("fs");
jest.mock("os");

describe("Git Profile - List Profiles", () => {
  let gitProfileCommandService: GitProfileCommandService;
  const mockHomedir = "/mock/home";
  const mockProfilePath = path.resolve(
    mockHomedir,
    ".celonis-content-cli-git-profiles",
  );

  beforeEach(() => {
    (os.homedir as jest.Mock).mockReturnValue(mockHomedir);

    gitProfileCommandService = new GitProfileCommandService();

    jest.spyOn(process, "exit").mockImplementation((code?: number) => {
      return undefined as never;
    });

    loggingTestTransport.logMessages = [];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Should list all Git profiles without a default profile", async () => {
    const mockProfiles = [
      { name: "profile1.json", isDirectory: () => false },
      { name: "profile2.json", isDirectory: () => false },
      { name: "profile3.json", isDirectory: () => false },
    ];

    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes("config.json")) {
        return false;
      }
      return true;
    });
    (fs.readdirSync as jest.Mock).mockReturnValue(mockProfiles);

    await gitProfileCommandService.listProfiles();

    expect(loggingTestTransport.logMessages).toHaveLength(3);
    expect(loggingTestTransport.logMessages[0].message.trim()).toEqual(
      "profile1",
    );
    expect(loggingTestTransport.logMessages[1].message.trim()).toEqual(
      "profile2",
    );
    expect(loggingTestTransport.logMessages[2].message.trim()).toEqual(
      "profile3",
    );
  });

  it("Should list all Git profiles and mark the default profile", async () => {
    const mockProfiles = [
      { name: "profile1.json", isDirectory: () => false },
      { name: "default-profile.json", isDirectory: () => false },
      { name: "profile3.json", isDirectory: () => false },
    ];

    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      return true;
    });
    (fs.readdirSync as jest.Mock).mockReturnValue(mockProfiles);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes("config.json")) {
        return JSON.stringify({ defaultProfile: "default-profile" });
      }
      return "{}";
    });

    await gitProfileCommandService.listProfiles();

    expect(loggingTestTransport.logMessages).toHaveLength(3);
    expect(loggingTestTransport.logMessages[0].message.trim()).toEqual(
      "profile1",
    );
    expect(loggingTestTransport.logMessages[1].message.trim()).toEqual(
      "default-profile (default)",
    );
    expect(loggingTestTransport.logMessages[2].message.trim()).toEqual(
      "profile3",
    );
  });

  it("Should handle when no profiles exist", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await gitProfileCommandService.listProfiles();

    expect(loggingTestTransport.logMessages).toHaveLength(0);
  });

  it("Should handle when profile directory exists but is empty", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);

    await gitProfileCommandService.listProfiles();

    expect(loggingTestTransport.logMessages).toHaveLength(0);
  });

  it("Should filter out config.json from the profile list", async () => {
    const mockProfiles = [
      { name: "profile1.json", isDirectory: () => false },
      { name: "config.json", isDirectory: () => false },
      { name: "profile2.json", isDirectory: () => false },
    ];

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(mockProfiles);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes("config.json")) {
        return JSON.stringify({ defaultProfile: "profile1" });
      }
      return "{}";
    });

    await gitProfileCommandService.listProfiles();

    expect(loggingTestTransport.logMessages).toHaveLength(2);
    expect(loggingTestTransport.logMessages[0].message.trim()).toEqual(
      "profile1 (default)",
    );
    expect(loggingTestTransport.logMessages[1].message.trim()).toEqual(
      "profile2",
    );
    expect(
      loggingTestTransport.logMessages.some(msg =>
        msg.message.includes("config"),
      ),
    ).toBe(false);
  });

  it("Should filter out directories from the profile list", async () => {
    const mockProfiles = [
      { name: "profile1.json", isDirectory: () => false },
      { name: "some-directory", isDirectory: () => true },
      { name: "profile2.json", isDirectory: () => false },
    ];

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(mockProfiles);
    (fs.readFileSync as jest.Mock).mockReturnValue("{}");

    await gitProfileCommandService.listProfiles();

    expect(loggingTestTransport.logMessages).toHaveLength(2);
    expect(loggingTestTransport.logMessages[0].message.trim()).toEqual(
      "profile1",
    );
    expect(loggingTestTransport.logMessages[1].message.trim()).toEqual(
      "profile2",
    );
  });

  it("Should filter out non-JSON files from the profile list", async () => {
    const mockProfiles = [
      { name: "profile1.json", isDirectory: () => false },
      { name: "readme.txt", isDirectory: () => false },
      { name: "profile2.json", isDirectory: () => false },
      { name: "notes.md", isDirectory: () => false },
    ];

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(mockProfiles);
    (fs.readFileSync as jest.Mock).mockReturnValue("{}");

    await gitProfileCommandService.listProfiles();

    expect(loggingTestTransport.logMessages).toHaveLength(2);
    expect(loggingTestTransport.logMessages[0].message.trim()).toEqual(
      "profile1",
    );
    expect(loggingTestTransport.logMessages[1].message.trim()).toEqual(
      "profile2",
    );
  });

  it("Should handle errors when reading profiles gracefully", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockImplementation(() => {
      throw new Error("Permission denied");
    });

    await gitProfileCommandService.listProfiles();

    expect(
      loggingTestTransport.logMessages.some(msg => msg.level.includes("error")),
    ).toBe(true);
  });

  it("Should handle when config.json exists but is empty", async () => {
    const mockProfiles = [
      { name: "profile1.json", isDirectory: () => false },
      { name: "profile2.json", isDirectory: () => false },
    ];

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(mockProfiles);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes("config.json")) {
        return "{}";
      }
      return "{}";
    });

    await gitProfileCommandService.listProfiles();

    expect(loggingTestTransport.logMessages).toHaveLength(2);
    expect(loggingTestTransport.logMessages[0].message.trim()).toEqual(
      "profile1",
    );
    expect(loggingTestTransport.logMessages[1].message.trim()).toEqual(
      "profile2",
    );
  });

  it("Should handle when config.json has a default profile that doesn't exist in the list", async () => {
    const mockProfiles = [
      { name: "profile1.json", isDirectory: () => false },
      { name: "profile2.json", isDirectory: () => false },
    ];

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(mockProfiles);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes("config.json")) {
        return JSON.stringify({ defaultProfile: "non-existent-profile" });
      }
      return "{}";
    });

    await gitProfileCommandService.listProfiles();

    expect(loggingTestTransport.logMessages).toHaveLength(2);
    expect(loggingTestTransport.logMessages[0].message.trim()).toEqual(
      "profile1",
    );
    expect(loggingTestTransport.logMessages[1].message.trim()).toEqual(
      "profile2",
    );
    expect(
      loggingTestTransport.logMessages.some(msg =>
        msg.message.includes("(default)"),
      ),
    ).toBe(false);
  });

  it("Should list profiles in the order they are read from the filesystem", async () => {
    const mockProfiles = [
      { name: "zeta.json", isDirectory: () => false },
      { name: "alpha.json", isDirectory: () => false },
      { name: "beta.json", isDirectory: () => false },
    ];

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(mockProfiles);
    (fs.readFileSync as jest.Mock).mockReturnValue("{}");

    await gitProfileCommandService.listProfiles();

    expect(loggingTestTransport.logMessages).toHaveLength(3);
    expect(loggingTestTransport.logMessages[0].message.trim()).toEqual("zeta");
    expect(loggingTestTransport.logMessages[1].message.trim()).toEqual("alpha");
    expect(loggingTestTransport.logMessages[2].message.trim()).toEqual("beta");
  });
});
