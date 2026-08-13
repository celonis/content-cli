import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import AdmZip = require("adm-zip");
import { mockAxiosGet, mockAxiosGetWithStatus } from "../utls/http-requests-mock";
import { testContext } from "../utls/test-context";
import { loggingTestTransport } from "../jest.setup";
import { FileService } from "../../src/core/utils/file-service";
import { CuiFileService } from "../../src/core/utils/cui-file-service";
import { parse } from "../../src/core/utils/yaml";
import { AssetCommandService } from "../../src/commands/studio/command-service/asset-command.service";
import { SkillCommandService } from "../../src/commands/action-flows/skill/skill-command.service";
import { DataPoolCommandService } from "../../src/commands/data-pipeline/data-pool/data-pool-command.service";
import { ViewBookmarksCommandService } from "../../src/commands/view/view-bookmarks-command.service";
import { AnalysisBookmarksCommandService } from "../../src/commands/analysis/analysis-bookmarks-command.service";
import { BookmarksCommandService } from "../../src/commands/bookmarks/bookmarks-command.service";

const COVER_URL = "https://myTeam.celonis.cloud/api/team/cui-settings/cui-pdf-cover";
const PDF_BYTES = Buffer.from("%PDF-1.4 cover sheet");

const PROJECT_ID = "project-1";
const SKILL_ID = "skill-1";
const POOL_ID = "pool-1";
const BOARD_ID = "board-1";
const ANALYSIS_ID = "analysis-1";
const PACKAGE_KEY = "my-package";

function markAsClassified(): void {
    mockAxiosGetWithStatus(COVER_URL, 200, {
        coverPage: { pdfContent: PDF_BYTES.toString("base64"), encoding: "base64" },
    });
}

function loggedFileName(): string {
    const prefix = FileService.fileDownloadedMessage;
    const message = loggingTestTransport.logMessages.map(entry => entry.message).find(entry => entry.includes(prefix));
    return message.split(prefix)[1];
}

function markedArchive(expectedName: string): AdmZip {
    const filename = loggedFileName();
    expect(filename).toEqual(`${CuiFileService.CLASSIFIED_PREFIX}${expectedName}.zip`);

    const archive = new AdmZip(readFileSync(resolve(process.cwd(), filename)));
    expect(archive.getEntry(CuiFileService.COVER_SHEET_FILE_NAME).getData().equals(PDF_BYTES)).toBe(true);
    return archive;
}

function markedEntry(expectedName: string, entryName: string): string {
    return markedArchive(expectedName).getEntry(entryName).getData().toString();
}

function markedJson(expectedName: string, entryName: string): any {
    return JSON.parse(markedEntry(expectedName, entryName));
}

describe("CUI marking of single-file exports", () => {

    beforeEach(() => {
        markAsClassified();
    });

    it("Should mark the exported asset as YAML", async () => {
        const asset = { key: "asset-1", name: "My Asset", rootNodeKey: PACKAGE_KEY };
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/nodes/asset/export/${PACKAGE_KEY}.asset-1`, asset);

        await new AssetCommandService(testContext).pullAsset(`${PACKAGE_KEY}.asset-1`);

        expect(parse(markedEntry("asset_asset-1", "asset_asset-1.yml"))).toEqual(asset);
    });

    it("Should mark the exported skill", async () => {
        const skill = { id: SKILL_ID, name: "My Skill" };
        mockAxiosGet(`https://myTeam.celonis.cloud/action-engine/api/projects/${PROJECT_ID}/skills/${SKILL_ID}/export`, skill);

        await new SkillCommandService(testContext).pullSkill(null, PROJECT_ID, SKILL_ID);

        expect(markedJson(`skill_${SKILL_ID}`, `skill_${SKILL_ID}.json`)).toEqual(skill);
    });

    it("Should mark the exported data pool", async () => {
        const dataPool = { id: POOL_ID, name: "Pool 1" };
        mockAxiosGet(`https://myTeam.celonis.cloud/integration/api/pools/${POOL_ID}/export`, dataPool);

        await new DataPoolCommandService(testContext).pullDataPool(POOL_ID);

        expect(markedJson(`data-pool_${POOL_ID}`, `data-pool_${POOL_ID}.json`)).toEqual(dataPool);
    });

    it("Should mark the exported view bookmarks", async () => {
        const bookmarks = [{ bookmark: { name: "My View Bookmark" } }];
        mockAxiosGet(`https://myTeam.celonis.cloud/blueprint/api/bookmarks/export?boardId=${BOARD_ID}&type=USER`, bookmarks);

        await new ViewBookmarksCommandService(testContext).pullViewBookmarks(BOARD_ID, undefined);

        expect(markedJson(`studio_view_bookmarks_${BOARD_ID}`, `studio_view_bookmarks_${BOARD_ID}.json`)).toEqual(bookmarks);
    });

    it("Should mark the exported analysis bookmarks", async () => {
        const bookmarks = [{ bookmark: { name: "My Analysis Bookmark" } }];
        mockAxiosGet(`https://myTeam.celonis.cloud/process-analytics/api/bookmarks/export?analysisId=${ANALYSIS_ID}&type=USER`, bookmarks);

        await new AnalysisBookmarksCommandService(testContext).pullAnalysisBookmarks(ANALYSIS_ID, "USER");

        expect(markedJson(`studio_analysis_bookmarks_${ANALYSIS_ID}`, `studio_analysis_bookmarks_${ANALYSIS_ID}.json`)).toEqual(bookmarks);
    });

    it("Should mark the exported package bookmarks under the user-chosen name", async () => {
        const bookmarks = { packageKey: PACKAGE_KEY, entries: [] };
        mockAxiosGet(`https://myTeam.celonis.cloud/package-manager/api/packages/${PACKAGE_KEY}/bookmarks/export`, bookmarks);

        await new BookmarksCommandService(testContext).exportBookmarks(PACKAGE_KEY, "custom.json");

        expect(markedJson("custom", "custom.json")).toEqual(bookmarks);
    });
});
