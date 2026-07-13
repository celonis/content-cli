import * as fs from "node:fs";
import * as path from "path";
import { mockAxiosGet, mockAxiosGetError } from "../../utls/http-requests-mock";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { FatalError } from "../../../src/core/utils/logger";
import { uniqueDirName } from "../../utls/fs-utils";

const SKILLS_BASE_URL = "https://myTeam.celonis.cloud/pacman/api/core/asset-registry/skills";

function absoluteOutputDir(outputDir: string): string {
    return path.resolve(process.cwd(), outputDir);
}

describe("Asset registry skills download", () => {
    const skillMdContent = Buffer.from("# Hello SKILL\n", "utf-8");
    const styleContent = Buffer.from("body { color: red; }\n", "utf-8");
    const exampleContent = Buffer.from("example content\n", "utf-8");

    it("Should download all files listed by the manifest into a new skill directory (platform skill)", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/files`, [
            "SKILL.md",
            "refs/style.md",
            "refs/nested/example.md",
        ]);
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/SKILL.md`, skillMdContent);
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/refs/style.md`, styleContent);
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/refs/nested/example.md`, exampleContent);

        const output = uniqueDirName();

        await new AssetRegistryService(testContext).downloadSkill({
            path: "platform/foo",
            output,
        });

        const skillDir = path.join(absoluteOutputDir(output), "foo");
        expect(fs.existsSync(skillDir)).toBe(true);

        const skillMd = path.join(skillDir, "SKILL.md");
        const style = path.join(skillDir, "refs", "style.md");
        const example = path.join(skillDir, "refs", "nested", "example.md");

        expect(fs.readFileSync(skillMd).equals(skillMdContent)).toBe(true);
        expect(fs.readFileSync(style).equals(styleContent)).toBe(true);
        expect(fs.readFileSync(example).equals(exampleContent)).toBe(true);

        const summaryLog = loggingTestTransport.logMessages[loggingTestTransport.logMessages.length - 1];
        expect(summaryLog.message).toContain("Downloaded 3 file(s) for skill 'platform/foo'");
        expect(summaryLog.message).toContain(skillDir);
    });

    it("Should use the last path segment as the skill directory name for asset skills", async () => {
        mockAxiosGet(
            `${SKILLS_BASE_URL}/asset/BOARD_V2/board-authoring/files`,
            ["SKILL.md"]
        );
        mockAxiosGet(`${SKILLS_BASE_URL}/asset/BOARD_V2/board-authoring/SKILL.md`, skillMdContent);

        const output = uniqueDirName();

        await new AssetRegistryService(testContext).downloadSkill({
            path: "asset/BOARD_V2/board-authoring",
            output,
        });

        const skillDir = path.join(absoluteOutputDir(output), "board-authoring");
        expect(fs.existsSync(path.join(skillDir, "SKILL.md"))).toBe(true);
    });

    it("Should default --output to the current working directory", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/cwd-default/files`, ["SKILL.md"]);
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/cwd-default/SKILL.md`, skillMdContent);

        await new AssetRegistryService(testContext).downloadSkill({
            path: "platform/cwd-default",
        });

        const skillDir = path.join(process.cwd(), "cwd-default");
        expect(fs.readFileSync(path.join(skillDir, "SKILL.md")).equals(skillMdContent)).toBe(true);
    });

    it("Should create the --output directory if it does not exist", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/files`, ["SKILL.md"]);
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/SKILL.md`, skillMdContent);

        const output = path.join(uniqueDirName(), "nested", "deep");
        expect(fs.existsSync(absoluteOutputDir(output))).toBe(false);

        await new AssetRegistryService(testContext).downloadSkill({
            path: "platform/foo",
            output,
        });

        const skillDir = path.join(absoluteOutputDir(output), "foo");
        expect(fs.existsSync(path.join(skillDir, "SKILL.md"))).toBe(true);
    });

    it("Should overwrite existing local files on re-download", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/files`, ["SKILL.md", "refs/style.md"]);
        const newSkill = Buffer.from("NEW SKILL", "utf-8");
        const newStyle = Buffer.from("NEW STYLE", "utf-8");
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/SKILL.md`, newSkill);
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/refs/style.md`, newStyle);

        const output = uniqueDirName();
        const skillDir = path.join(absoluteOutputDir(output), "foo");
        fs.mkdirSync(path.join(skillDir, "refs"), { recursive: true });
        fs.writeFileSync(path.join(skillDir, "SKILL.md"), "OLD SKILL");
        fs.writeFileSync(path.join(skillDir, "refs", "style.md"), "OLD STYLE");

        await new AssetRegistryService(testContext).downloadSkill({
            path: "platform/foo",
            output,
        });

        expect(fs.readFileSync(path.join(skillDir, "SKILL.md")).equals(newSkill)).toBe(true);
        expect(fs.readFileSync(path.join(skillDir, "refs", "style.md")).equals(newStyle)).toBe(true);
    });

    it("Should URI-encode skill and file segments while preserving slashes", async () => {
        const listUrl = `${SKILLS_BASE_URL}/asset/BOARD_V2/${encodeURIComponent("with space")}/files`;
        const fileUrl = `${SKILLS_BASE_URL}/asset/BOARD_V2/${encodeURIComponent("with space")}/${encodeURIComponent("dir with space")}/a.md`;
        mockAxiosGet(listUrl, ["dir with space/a.md"]);
        mockAxiosGet(fileUrl, skillMdContent);

        const output = uniqueDirName();

        await new AssetRegistryService(testContext).downloadSkill({
            path: "asset/BOARD_V2/with space",
            output,
        });

        const written = path.join(absoluteOutputDir(output), "with space", "dir with space", "a.md");
        expect(fs.existsSync(written)).toBe(true);
    });

    it("Should log an info message and skip disk writes when the manifest is empty", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/empty/files`, []);
        const output = uniqueDirName();

        await new AssetRegistryService(testContext).downloadSkill({
            path: "platform/empty",
            output,
        });

        expect(loggingTestTransport.logMessages).toHaveLength(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            "No files found for skill 'platform/empty'."
        );
        expect(fs.existsSync(path.join(absoluteOutputDir(output), "empty"))).toBe(false);
    });

    it("Should surface a clear FatalError when the manifest endpoint returns 404", async () => {
        mockAxiosGetError(`${SKILLS_BASE_URL}/platform/missing/files`, 404, {
            error: "Skill not found",
        });

        await expect(
            new AssetRegistryService(testContext).downloadSkill({
                path: "platform/missing",
                output: uniqueDirName(),
            })
        ).rejects.toThrow(/Problem listing skill files for 'platform\/missing':/);
    });

    it("Should surface a clear FatalError when one of the listed files fails to download", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/partial/files`, [
            "SKILL.md",
            "refs/missing.md",
        ]);
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/partial/SKILL.md`, skillMdContent);
        mockAxiosGetError(`${SKILLS_BASE_URL}/platform/partial/refs/missing.md`, 404, {
            error: "File not found",
        });

        await expect(
            new AssetRegistryService(testContext).downloadSkill({
                path: "platform/partial",
                output: uniqueDirName(),
            })
        ).rejects.toThrow(/Problem getting skill file 'refs\/missing\.md' for 'platform\/partial':/);
    });

    it("Should refuse to write manifest entries that escape the skill directory", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/evil/files`, ["../escape.md"]);

        await expect(
            new AssetRegistryService(testContext).downloadSkill({
                path: "platform/evil",
                output: uniqueDirName(),
            })
        ).rejects.toThrow(
            new FatalError(
                "Refusing to write file '../escape.md' from skill 'platform/evil': path escapes the skill directory."
            )
        );
    });

    it("Should throw a synchronous FatalError when --path cannot yield a skill name", async () => {
        await expect(
            new AssetRegistryService(testContext).downloadSkill({
                path: "/",
                output: uniqueDirName(),
            })
        ).rejects.toThrow(new FatalError("--path must identify a skill, got '/'."));
    });

    it("Should reject an empty file path in the manifest", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/bad/files`, [""]);

        await expect(
            new AssetRegistryService(testContext).downloadSkill({
                path: "platform/bad",
                output: uniqueDirName(),
            })
        ).rejects.toThrow(
            new FatalError("Skill manifest for 'platform/bad' contained an empty file path.")
        );
    });
});
