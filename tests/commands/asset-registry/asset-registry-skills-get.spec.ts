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

    function absoluteOutputDir(outputDir: string): string {
        return path.resolve(process.cwd(), outputDir);
    }

    it("Should download SKILL.md by default for a platform skill", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/foo`, skillContent);
        const output = uniqueDirName();

        await new AssetRegistryService(testContext).getSkillFile({
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

        await new AssetRegistryService(testContext).getSkillFile({
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

        await new AssetRegistryService(testContext).getSkillFile({
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

        await new AssetRegistryService(testContext).getSkillFile({
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

        await new AssetRegistryService(testContext).getSkillFile({
            path: "platform/foo",
            output,
        });

        expect(fs.readFileSync(target).equals(newContent)).toBe(true);
    });

    it("Should default --output to the current working directory", async () => {
        mockAxiosGet(`${SKILLS_BASE_URL}/platform/cwd-default`, skillContent);

        await new AssetRegistryService(testContext).getSkillFile({
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

        await new AssetRegistryService(testContext).getSkillFile({
            path: "asset/BOARD_V2/with space",
            output,
        });

        const written = path.join(absoluteOutputDir(output), "SKILL.md");
        expect(fs.existsSync(written)).toBe(true);
    });

    it("Should surface a clear FatalError when the backend returns 404 for SKILL.md", async () => {
        mockAxiosGetError(`${SKILLS_BASE_URL}/platform/missing`, 404, { error: "Skill not found" });

        await expect(
            new AssetRegistryService(testContext).getSkillFile({
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
            new AssetRegistryService(testContext).getSkillFile({
                path: "platform/foo",
                file: "refs/missing.md",
                output: uniqueDirName(),
            })
        ).rejects.toThrow(/Problem getting skill file 'refs\/missing\.md' for 'platform\/foo':/);
    });

    it("Should throw a synchronous FatalError when --file resolves to an empty basename", async () => {
        await expect(
            new AssetRegistryService(testContext).getSkillFile({
                path: "platform/foo",
                file: "/",
                output: uniqueDirName(),
            })
        ).rejects.toThrow(new FatalError("--file must point to a file, got '/'."));
    });
});
