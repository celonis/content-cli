import * as fs from "node:fs";
import * as path from "path";
import { mockAxiosGet, mockAxiosGetError } from "../../utls/http-requests-mock";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { FatalError } from "../../../src/core/utils/logger";
import { FileService } from "../../../src/core/utils/file-service";
import { uniqueDirName } from "../../utls/fs-utils";

const SKILLS_BASE_URL = "https://myTeam.celonis.cloud/pacman/api/core/asset-registry/skills";

describe("Asset registry skills get", () => {
    const skillContent = Buffer.from("# Hello SKILL\n\nLine 2.\n", "utf-8");
    const styleContent = Buffer.from("body { color: red; }\n", "utf-8");
    const exampleContent = Buffer.from("example content\n", "utf-8");

    function absoluteOutputDir(outputDir: string): string {
        return path.resolve(process.cwd(), outputDir);
    }

    it("Should download SKILL.md by default for a platform skill", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo`, skillContent);
        const output = uniqueDirName();

        await new AssetRegistryService(testContext).getSkill({
            path: "platform/foo",
            output,
        });

        const written = path.join(absoluteOutputDir(output), "SKILL.md");
        expect(fs.existsSync(written)).toBe(true);
        expect(fs.readFileSync(written).equals(skillContent)).toBe(true);

        expect(loggingTestTransport.logMessages).toHaveLength(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(
            FileService.fileDownloadedMessage + written
        );
    });

    it("Should download SKILL.md by default for an asset skill (multi-segment path)", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/asset/BOARD_V2/board-authoring`, skillContent);
        const output = uniqueDirName();

        await new AssetRegistryService(testContext).getSkill({
            path: "asset/BOARD_V2/board-authoring",
            output,
        });

        const written = path.join(absoluteOutputDir(output), "SKILL.md");
        expect(fs.existsSync(written)).toBe(true);
        expect(fs.readFileSync(written).equals(skillContent)).toBe(true);
    });

    it("Should write a reference file using only its basename (strips --file subdirs)", async () => {
        const refContent = Buffer.from("ref content", "utf-8");
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/refs/style.md`, refContent);
        const output = uniqueDirName();

        await new AssetRegistryService(testContext).getSkill({
            path: "platform/foo",
            file: "refs/style.md",
            output,
        });

        const written = path.join(absoluteOutputDir(output), "style.md");
        expect(fs.existsSync(written)).toBe(true);
        expect(fs.readFileSync(written).equals(refContent)).toBe(true);

        const subdirWritten = path.join(absoluteOutputDir(output), "refs", "style.md");
        expect(fs.existsSync(subdirWritten)).toBe(false);
    });

    it("Should create the --output directory if it does not exist", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo`, skillContent);
        const output = path.join(uniqueDirName(), "nested", "deep");
        expect(fs.existsSync(absoluteOutputDir(output))).toBe(false);

        await new AssetRegistryService(testContext).getSkill({
            path: "platform/foo",
            output,
        });

        expect(fs.existsSync(absoluteOutputDir(output))).toBe(true);
        const written = path.join(absoluteOutputDir(output), "SKILL.md");
        expect(fs.existsSync(written)).toBe(true);
        expect(fs.readFileSync(written).equals(skillContent)).toBe(true);
    });

    it("Should overwrite an existing local file", async () => {
        const newContent = Buffer.from("NEW", "utf-8");
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo`, newContent);
        const output = uniqueDirName();
        fs.mkdirSync(absoluteOutputDir(output), { recursive: true });
        const target = path.join(absoluteOutputDir(output), "SKILL.md");
        fs.writeFileSync(target, "OLD");

        await new AssetRegistryService(testContext).getSkill({
            path: "platform/foo",
            output,
        });

        expect(fs.readFileSync(target).equals(newContent)).toBe(true);
    });

    it("Should default --output to the current working directory", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/cwd-default`, skillContent);

        await new AssetRegistryService(testContext).getSkill({
            path: "platform/cwd-default",
        });

        const written = path.join(process.cwd(), "SKILL.md");
        expect(fs.existsSync(written)).toBe(true);
        expect(fs.readFileSync(written).equals(skillContent)).toBe(true);
    });

    it("Should URI-encode path segments while preserving slashes", async () => {
        const url = `${SKILLS_BASE_URL}/asset/BOARD_V2/${encodeURIComponent("with space")}`;
        mockAxiosGet(url, skillContent);
        const output = uniqueDirName();

        await new AssetRegistryService(testContext).getSkill({
            path: "asset/BOARD_V2/with space",
            output,
        });

        const written = path.join(absoluteOutputDir(output), "SKILL.md");
        expect(fs.existsSync(written)).toBe(true);
    });

    it("Should surface a clear FatalError when the backend returns 404 for SKILL.md", async () => {
        mockAxiosGetError(`${SKILLS_BASE_URL}/platform/missing`, 404, { error: "Skill not found" });

        await expect(
            new AssetRegistryService(testContext).getSkill({
                path: "platform/missing",
                output: uniqueDirName(),
            })
        ).rejects.toThrow(/Problem getting SKILL\.md for 'platform\/missing':/);
    });

    it("Should surface a clear FatalError when the backend returns 404 for a reference file", async () => {
        mockAxiosGetError(`${SKILLS_BASE_URL}/platform/foo/refs/missing.md`, 404, {
            error: "File not found",
        });

        await expect(
            new AssetRegistryService(testContext).getSkill({
                path: "platform/foo",
                file: "refs/missing.md",
                output: uniqueDirName(),
            })
        ).rejects.toThrow(/Problem getting skill file 'refs\/missing\.md' for 'platform\/foo':/);
    });

    it("Should throw a synchronous FatalError when --file resolves to an empty basename", async () => {
        await expect(
            new AssetRegistryService(testContext).getSkill({
                path: "platform/foo",
                file: "/",
                output: uniqueDirName(),
            })
        ).rejects.toThrow(new FatalError("--file must point to a file, got '/'."));
    });

    it("Should download all files listed by the manifest into a new skill directory (platform skill)", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/files`, { files: ["SKILL.md", "refs/style.md", "refs/nested/example.md"] });
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/SKILL.md`, skillContent);
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/refs/style.md`, styleContent);
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/refs/nested/example.md`, exampleContent);

        const output = uniqueDirName();

        await new AssetRegistryService(testContext).getSkill({
            path: "platform/foo",
            output,
            all: true,
        });

        const skillDir = path.join(absoluteOutputDir(output), "foo");
        expect(fs.existsSync(skillDir)).toBe(true);

        const skillMd = path.join(skillDir, "SKILL.md");
        const style = path.join(skillDir, "refs", "style.md");
        const example = path.join(skillDir, "refs", "nested", "example.md");

        expect(fs.readFileSync(skillMd).equals(skillContent)).toBe(true);
        expect(fs.readFileSync(style).equals(styleContent)).toBe(true);
        expect(fs.readFileSync(example).equals(exampleContent)).toBe(true);

        const summaryLog = loggingTestTransport.logMessages[loggingTestTransport.logMessages.length - 1];
        expect(summaryLog.message).toContain("Downloaded 3 file(s) for skill 'platform/foo'");
        expect(summaryLog.message).toContain(skillDir);
    });

    it("Should use the last path segment as the skill directory name for asset skills", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/asset/BOARD_V2/board-authoring/files`, { files: ["SKILL.md"] });
        mockAxiosGet(`${SKILLS_BASE_URL}/asset/BOARD_V2/board-authoring/SKILL.md`, skillContent);

        const output = uniqueDirName();

        await new AssetRegistryService(testContext).getSkill({
            path: "asset/BOARD_V2/board-authoring",
            output,
            all: true,
        });

        const skillDir = path.join(absoluteOutputDir(output), "board-authoring");
        expect(fs.existsSync(path.join(skillDir, "SKILL.md"))).toBe(true);
    });

    it("Should surface a clear FatalError when one of the listed files fails to download", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/partial/files`, { files: ["SKILL.md", "refs/missing.md"] });
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/partial/SKILL.md`, skillContent);
        mockAxiosGetError(`${SKILLS_BASE_URL}/platform/partial/refs/missing.md`, 404, {
            error: "File not found",
        });

        await expect(
            new AssetRegistryService(testContext).getSkill({
                path: "platform/partial",
                output: uniqueDirName(),
                all: true,
            })
        ).rejects.toThrow(/Problem getting skill file 'refs\/missing\.md' for 'platform\/partial':/);
    });

    it("Should refuse to write manifest entries that escape the skill directory", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/evil/files`, { files: ["../escape.md"] });

        await expect(
            new AssetRegistryService(testContext).getSkill({
                path: "platform/evil",
                output: uniqueDirName(),
                all: true,
            })
        ).rejects.toThrow(
            new FatalError(
                "Refusing to write file '../escape.md' from skill 'platform/evil': path escapes the skill directory."
            )
        );
    });

    it("Should throw a synchronous FatalError when --path cannot yield a skill name", async () => {
        await expect(
            new AssetRegistryService(testContext).getSkill({
                path: "/",
                output: uniqueDirName(),
                all: true,
            })
        ).rejects.toThrow(new FatalError("--path must identify a skill, got '/'."));
    });

    it("Should reject an empty file path in the manifest", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/bad/files`, { files: [""] });

        await expect(
            new AssetRegistryService(testContext).getSkill({
                path: "platform/bad",
                output: uniqueDirName(),
                all: true,
            })
        ).rejects.toThrow(new FatalError("Skill manifest for 'platform/bad' contained an empty file path."));
    });

    it("Should throw a FatalError when both --file and --all are provided", async () => {
        await expect(
            new AssetRegistryService(testContext).getSkill({
                path: "platform/foo",
                file: "SKILL.md",
                output: uniqueDirName(),
                all: true,
            })
        ).rejects.toThrow(
            new FatalError(
                "Options --file and --all are mutually exclusive. Use --file to download an individual file (defaults to SKILL.md) or --all to download all files (SKILL.md and reference files)."
            )
        );
    });

    it("Should default --output to the current working directory when --all is set", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/cwd-default-all/files`, { files: ["SKILL.md"] });
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/cwd-default-all/SKILL.md`, skillContent);

        await new AssetRegistryService(testContext).getSkill({
            path: "platform/cwd-default-all",
            all: true,
        });

        const skillDir = path.join(process.cwd(), "cwd-default-all");
        expect(fs.readFileSync(path.join(skillDir, "SKILL.md")).equals(skillContent)).toBe(true);
    });

    it("Should create a nested --output directory that does not exist when --all is set", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/files`, { files: ["SKILL.md"] });
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/SKILL.md`, skillContent);

        const output = path.join(uniqueDirName(), "nested", "deep");
        expect(fs.existsSync(absoluteOutputDir(output))).toBe(false);

        await new AssetRegistryService(testContext).getSkill({
            path: "platform/foo",
            output,
            all: true,
        });

        const skillDir = path.join(absoluteOutputDir(output), "foo");
        expect(fs.readFileSync(path.join(skillDir, "SKILL.md")).equals(skillContent)).toBe(true);
    });

    it("Should overwrite existing local files on re-download when --all is set", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/files`, { files: ["SKILL.md", "refs/style.md"] });
        const newSkill = Buffer.from("NEW SKILL", "utf-8");
        const newStyle = Buffer.from("NEW STYLE", "utf-8");
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/SKILL.md`, newSkill);
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo/refs/style.md`, newStyle);

        const output = uniqueDirName();
        const skillDir = path.join(absoluteOutputDir(output), "foo");
        fs.mkdirSync(path.join(skillDir, "refs"), { recursive: true });
        fs.writeFileSync(path.join(skillDir, "SKILL.md"), "OLD SKILL");
        fs.writeFileSync(path.join(skillDir, "refs", "style.md"), "OLD STYLE");

        await new AssetRegistryService(testContext).getSkill({
            path: "platform/foo",
            output,
            all: true,
        });

        expect(fs.readFileSync(path.join(skillDir, "SKILL.md")).equals(newSkill)).toBe(true);
        expect(fs.readFileSync(path.join(skillDir, "refs", "style.md")).equals(newStyle)).toBe(true);
    });

    it("Should URI-encode multi-segment skill and file paths under --all", async () => {
        const listUrl = `${SKILLS_BASE_URL}/asset/BOARD_V2/${encodeURIComponent("with space")}/files`;
        const fileUrl = `${SKILLS_BASE_URL}/asset/BOARD_V2/${encodeURIComponent("with space")}/${encodeURIComponent("dir with space")}/a.md`;
        mockAxiosGet(listUrl, { files: ["dir with space/a.md"] });
        mockAxiosGet(fileUrl, skillContent);

        const output = uniqueDirName();

        await new AssetRegistryService(testContext).getSkill({
            path: "asset/BOARD_V2/with space",
            output,
            all: true,
        });

        const written = path.join(absoluteOutputDir(output), "with space", "dir with space", "a.md");
        expect(fs.existsSync(written)).toBe(true);
    });

    it("Should log 'No files found' and write nothing when the manifest is empty", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/empty/files`, { files: [] });
        const output = uniqueDirName();

        await new AssetRegistryService(testContext).getSkill({
            path: "platform/empty",
            output,
            all: true,
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
            new AssetRegistryService(testContext).getSkill({
                path: "platform/missing",
                output: uniqueDirName(),
                all: true,
            })
        ).rejects.toThrow(/Problem listing skill files for 'platform\/missing':/);
    });
});
