import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import AdmZip = require("adm-zip");
import { mockAxiosGet, mockAxiosGetError, mockAxiosGetWithStatus, mockedAxiosInstance } from "../../utls/http-requests-mock";
import { SpaceCommandService } from "../../../src/commands/studio/command-service/space-command.service";
import { PackageCommandService } from "../../../src/commands/studio/command-service/package-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { CuiFileService } from "../../../src/core/utils/cui-file-service";

const SPACES_URL = "https://myTeam.celonis.cloud/package-manager/api/spaces";
const PACKAGES_URL = "https://myTeam.celonis.cloud/package-manager/api/packages";
const COVER_URL = "https://myTeam.celonis.cloud/api/team/cui-settings/cui-pdf-cover";

const SPACES = [{ id: "space-1", name: "My Space" }];
const PACKAGES = [{ key: "pkg-1", name: "My Package", rootNodeKey: "pkg-1" }];
const LISTED_PACKAGES = [{ key: "pkg-1", name: "My Package" }];
const PDF_BYTES = Buffer.from("%PDF-1.4 cover sheet");

function classifiedCover(): object {
    return {
        coverPage: { pdfContent: PDF_BYTES.toString("base64"), encoding: "base64" },
    };
}

function loggedFileName(): string {
    return loggingTestTransport.logMessages[0].message.split(FileService.fileDownloadedMessage)[1];
}

function readWrittenJson(filename: string): any {
    return JSON.parse(readFileSync(resolve(process.cwd(), filename), "utf-8"));
}

function payloadFromArchive(filename: string): any {
    const archive = new AdmZip(readFileSync(resolve(process.cwd(), filename)));
    const entries = archive.getEntries().map(entry => entry.entryName);

    expect(entries).toContain(CuiFileService.COVER_SHEET_FILE_NAME);
    expect(archive.getEntry(CuiFileService.COVER_SHEET_FILE_NAME).getData().equals(PDF_BYTES)).toBe(true);

    const payloadEntry = entries.find(entry => entry.endsWith(".json"));
    return JSON.parse(archive.getEntry(payloadEntry).getData().toString());
}

function coverWasRequested(): boolean {
    return (mockedAxiosInstance.get as jest.Mock).mock.calls.some(call => call[0] === COVER_URL);
}

describe("CUI marking of Studio listings", () => {

    describe("list spaces --json", () => {
        const listSpaces = () => new SpaceCommandService(testContext).listSpaces(true);

        beforeEach(() => {
            mockAxiosGet(SPACES_URL, SPACES);
        });

        it("Should wrap the listing and the cover sheet into a CUI archive when classified", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, classifiedCover());

            await listSpaces();

            const filename = loggedFileName();
            expect(filename.startsWith(CuiFileService.CLASSIFIED_PREFIX)).toBe(true);
            expect(filename.endsWith(".zip")).toBe(true);
            expect(payloadFromArchive(filename)).toEqual(SPACES);
        });

        it("Should keep the original filename when the feature flag is disabled", async () => {
            mockAxiosGetError(COVER_URL, 403, { errorCode: "feature-disabled" });

            await listSpaces();

            const filename = loggedFileName();
            expect(filename.startsWith(CuiFileService.CLASSIFIED_PREFIX)).toBe(false);
            expect(readWrittenJson(filename)).toEqual(SPACES);
        });

        it("Should not probe CUI when the listing only goes to the console", async () => {
            await new SpaceCommandService(testContext).listSpaces(false);

            expect(loggingTestTransport.logMessages[0].message).toContain(`space-1 - Name: "My Space"`);
            expect(coverWasRequested()).toBe(false);
        });
    });

    describe("list packages --json", () => {
        const listPackages = () => new PackageCommandService(testContext).listPackages(true, false, []);

        beforeEach(() => {
            mockAxiosGet(PACKAGES_URL, PACKAGES);
        });

        it("Should wrap the listing and the cover sheet into a CUI archive when classified", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, classifiedCover());

            await listPackages();

            const filename = loggedFileName();
            expect(filename.startsWith(CuiFileService.CLASSIFIED_PREFIX)).toBe(true);
            expect(filename.endsWith(".zip")).toBe(true);
            expect(payloadFromArchive(filename)).toEqual(LISTED_PACKAGES);
        });

        it("Should keep the original filename when the feature flag is disabled", async () => {
            mockAxiosGetError(COVER_URL, 403, { errorCode: "feature-disabled" });

            await listPackages();

            const filename = loggedFileName();
            expect(filename.startsWith(CuiFileService.CLASSIFIED_PREFIX)).toBe(false);
            expect(readWrittenJson(filename)).toEqual(LISTED_PACKAGES);
        });

        it("Should not probe CUI when the listing only goes to the console", async () => {
            await new PackageCommandService(testContext).listPackages(false, false, []);

            expect(loggingTestTransport.logMessages[0].message).toContain(`My Package - Key: "pkg-1"`);
            expect(coverWasRequested()).toBe(false);
        });
    });
});
