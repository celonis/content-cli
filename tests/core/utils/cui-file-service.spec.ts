import { accessSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import AdmZip = require("adm-zip");
import { Context } from "../../../src/core/command/cli-context";
import { HttpClient } from "../../../src/core/http/http-client";
import { CuiFileService } from "../../../src/core/utils/cui-file-service";
import { CuiMarkingCache } from "../../../src/core/utils/cui-marking-cache";
import { FatalError } from "../../../src/core/utils/logger";
import { testContext } from "../../utls/test-context";
import { mockAxiosGetError, mockAxiosGetWithStatus, mockedAxiosInstance } from "../../utls/http-requests-mock";

describe("CuiFileService", () => {
    const COVER_URL = "https://myTeam.celonis.cloud/api/team/cui-settings/cui-pdf-cover";
    const PDF_BYTES = Buffer.from("%PDF-1.4 cover sheet");
    const PAYLOAD = JSON.stringify({ key: "pkg-1" });

    let cuiFileService: CuiFileService;

    const coverResponse = () => ({
        coverPage: {
            pdfContent: PDF_BYTES.toString("base64"),
            encoding: "base64",
        },
    });

    const readFile = (filename: string): Buffer => readFileSync(resolve(process.cwd(), filename));

    const coverRequestCount = (): number =>
        (mockedAxiosInstance.get as jest.Mock).mock.calls.filter(call => call[0] === COVER_URL).length;

    beforeEach(() => {
        cuiFileService = new CuiFileService(testContext);
    });

    describe("when CUI marking does not apply", () => {
        it("Should keep the original filename when the feature flag is disabled", async () => {
            mockAxiosGetError(COVER_URL, 403, { errorCode: "feature-disabled" });

            const filename = await cuiFileService.writeToFileWithGivenName(PAYLOAD, "report.json");

            expect(filename).toEqual("report.json");
            expect(readFile("report.json").toString()).toEqual(PAYLOAD);
        });
    });

    describe("when the cover response cannot be used", () => {
        it("Should fail on an unexpected backend error", async () => {
            mockAxiosGetError(COVER_URL, 500, { message: "boom" });

            await expect(cuiFileService.writeToFileWithGivenName(PAYLOAD, "broken.json")).rejects.toThrow(FatalError);
            expect(() => accessSync(resolve(process.cwd(), "broken.json"))).toThrow();
        });

        it("Should fail when the marking applies but the response body is empty", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, "");

            await expect(cuiFileService.writeToFileWithGivenName(PAYLOAD, "empty-cover.json")).rejects.toThrow(FatalError);
            expect(() => accessSync(resolve(process.cwd(), "empty-cover.json"))).toThrow();
        });

        it("Should fail when the backend answers with no content", async () => {
            mockAxiosGetWithStatus(COVER_URL, 204, "");

            await expect(cuiFileService.writeToFileWithGivenName(PAYLOAD, "no-content.json")).rejects.toThrow(FatalError);
            expect(() => accessSync(resolve(process.cwd(), "no-content.json"))).toThrow();
        });
    });

    describe("when the content is classified", () => {
        it("Should wrap the payload and the decoded cover sheet into a CUI archive", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse());

            const filename = await cuiFileService.writeToFileWithGivenName(PAYLOAD, "packages.json");

            expect(filename).toEqual("CUI - packages.zip");

            const zip = new AdmZip(readFile(filename));
            expect(zip.getEntries().map(entry => entry.entryName).sort())
                .toEqual([CuiFileService.COVER_SHEET_FILE_NAME, "packages.json"]);
            expect(zip.getEntry("packages.json").getData().toString()).toEqual(PAYLOAD);
            expect(zip.getEntry(CuiFileService.COVER_SHEET_FILE_NAME).getData().equals(PDF_BYTES)).toBe(true);
        });

        it("Should fail when the cover page uses an unsupported encoding", async () => {
            const response = coverResponse();
            response.coverPage.encoding = "hex";
            mockAxiosGetWithStatus(COVER_URL, 200, response);

            await expect(cuiFileService.writeToFileWithGivenName(PAYLOAD, "packages.json"))
                .rejects.toThrow("Unsupported CUI cover page encoding: hex");
        });

        it("Should fail when the marking applies but no cover page was returned", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, { teamId: "team-1" });

            await expect(cuiFileService.writeToFileWithGivenName(PAYLOAD, "packages.json"))
                .rejects.toThrow("CUI marking applies but the response contained no cover page.");
        });
    });

    describe("when the artifact is already an archive", () => {
        const buildExportZip = (): Buffer => {
            const zip = new AdmZip();
            zip.addFile("manifest.json", Buffer.from(JSON.stringify({ packageKey: "pkg-1" })));
            zip.addFile("nodes/node-1.json", Buffer.from(JSON.stringify({ key: "node-1" })));
            return zip.toBuffer();
        };

        const entryNames = (filename: string): string[] =>
            new AdmZip(readFile(filename)).getEntries().map(entry => entry.entryName).sort();

        it("Should keep the archive untouched when no marking applies", async () => {
            mockAxiosGetError(COVER_URL, 403, { errorCode: "feature-disabled" });
            const exportZip = buildExportZip();

            const filename = await cuiFileService.writeZipToFileWithGivenName(exportZip, "export.zip");

            expect(filename).toEqual("export.zip");
            expect(readFile(filename).equals(exportZip)).toBe(true);
        });

        it("Should add the cover sheet into the given archive instead of nesting it", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse());

            const filename = await cuiFileService.writeZipToFileWithGivenName(buildExportZip(), "export.zip");

            expect(filename).toEqual("CUI - export.zip");
            expect(entryNames(filename)).toEqual([
                CuiFileService.COVER_SHEET_FILE_NAME,
                "manifest.json",
                "nodes/node-1.json",
            ]);

            const archive = new AdmZip(readFile(filename));
            expect(archive.getEntry(CuiFileService.COVER_SHEET_FILE_NAME).getData().equals(PDF_BYTES)).toBe(true);
            expect(archive.getEntries().some(entry => entry.entryName.endsWith(".zip"))).toBe(false);
        });

        it("Should fail when the marking applies but no cover page was returned", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, { teamId: "team-1" });

            await expect(cuiFileService.writeZipToFileWithGivenName(buildExportZip(), "export.zip"))
                .rejects.toThrow("CUI marking applies but the response contained no cover page.");
        });
    });

    describe("when several artifacts are written in the same run", () => {
        it("Should ask for the cover once and mark every artifact the same way", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse());

            const firstFilename = await cuiFileService.writeToFileWithGivenName(PAYLOAD, "packages.json");
            const secondFilename = await cuiFileService.writeToFileWithGivenName(PAYLOAD, "summary.json");

            expect(firstFilename).toEqual("CUI - packages.zip");
            expect(secondFilename).toEqual("CUI - summary.zip");
            expect(coverRequestCount()).toEqual(1);
        });

        it("Should ask again after a failed cover request", async () => {
            mockAxiosGetError(COVER_URL, 500, { message: "boom" });

            await expect(cuiFileService.writeToFileWithGivenName(PAYLOAD, "failed.json")).rejects.toThrow(FatalError);

            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse());
            const filename = await cuiFileService.writeToFileWithGivenName(PAYLOAD, "recovered.json");

            expect(filename).toEqual("CUI - recovered.zip");
            expect(coverRequestCount()).toEqual(2);
        });
    });

    describe("when a later command runs in the same session", () => {
        const cacheDirectory = (): string => process.env[CuiMarkingCache.CACHE_DIRECTORY_ENV_VARIABLE];

        const nextRun = (profileName: string = "test"): CuiFileService => {
            const context = new Context({});
            context.profile = { ...testContext.profile, name: profileName };
            context._httpClient = new HttpClient(context);

            return new CuiFileService(context);
        };

        const overwriteCachedDecision = (contents: string): void =>
            readdirSync(cacheDirectory()).forEach(entry => writeFileSync(join(cacheDirectory(), entry), contents));

        it("Should reuse a classified decision without asking again", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse());
            await cuiFileService.writeToFileWithGivenName(PAYLOAD, "first-run.json");

            const filename = await nextRun().writeToFileWithGivenName(PAYLOAD, "second-run.json");

            expect(filename).toEqual("CUI - second-run.zip");
            expect(readFile(filename).length).toBeGreaterThan(0);
            expect(coverRequestCount()).toEqual(1);
        });

        it("Should reuse a disabled decision without asking again", async () => {
            mockAxiosGetError(COVER_URL, 403, { errorCode: "feature-disabled" });
            await cuiFileService.writeToFileWithGivenName(PAYLOAD, "first-run.json");

            const filename = await nextRun().writeToFileWithGivenName(PAYLOAD, "second-run.json");

            expect(filename).toEqual("second-run.json");
            expect(coverRequestCount()).toEqual(1);
        });

        it("Should ask again when the earlier command failed", async () => {
            mockAxiosGetError(COVER_URL, 500, { message: "boom" });
            await expect(cuiFileService.writeToFileWithGivenName(PAYLOAD, "failed.json")).rejects.toThrow(FatalError);

            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse());
            const filename = await nextRun().writeToFileWithGivenName(PAYLOAD, "recovered.json");

            expect(filename).toEqual("CUI - recovered.zip");
            expect(coverRequestCount()).toEqual(2);
        });

        it("Should ask again when the cached decision is unreadable", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse());
            await cuiFileService.writeToFileWithGivenName(PAYLOAD, "first-run.json");
            overwriteCachedDecision("not json");

            const filename = await nextRun().writeToFileWithGivenName(PAYLOAD, "after-corruption.json");

            expect(filename).toEqual("CUI - after-corruption.zip");
            expect(coverRequestCount()).toEqual(2);
        });

        it("Should ask again when the cached decision is classified without a cover", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse());
            await cuiFileService.writeToFileWithGivenName(PAYLOAD, "first-run.json");
            overwriteCachedDecision(JSON.stringify({ marking: "CLASSIFIED" }));

            const filename = await nextRun().writeToFileWithGivenName(PAYLOAD, "after-tampering.json");

            expect(filename).toEqual("CUI - after-tampering.zip");
            expect(coverRequestCount()).toEqual(2);
        });

        it("Should not reuse a decision made for another profile", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse());
            await cuiFileService.writeToFileWithGivenName(PAYLOAD, "first-run.json");

            const filename = await nextRun("other-team").writeToFileWithGivenName(PAYLOAD, "other-profile.json");

            expect(filename).toEqual("CUI - other-profile.zip");
            expect(coverRequestCount()).toEqual(2);
        });
    });

    describe("when the artifact is a directory", () => {
        const writeTree = (targetDir: string): void => {
            mkdirSync(resolve(process.cwd(), targetDir, "nodes"), { recursive: true });
            writeFileSync(resolve(process.cwd(), targetDir, "package.json"), PAYLOAD);
            writeFileSync(resolve(process.cwd(), targetDir, "nodes", "node-1.json"), PAYLOAD);
        };

        const exists = (...segments: string[]): boolean => existsSync(resolve(process.cwd(), ...segments));

        it("Should keep the original directory name when no marking applies", async () => {
            mockAxiosGetError(COVER_URL, 403, { errorCode: "feature-disabled" });

            const directoryName = await cuiFileService.writeDirectoryWithGivenName(writeTree, "unmarked-export");

            expect(directoryName).toEqual("unmarked-export");
            expect(exists(directoryName, "package.json")).toBe(true);
            expect(exists(directoryName, CuiFileService.COVER_SHEET_FILE_NAME)).toBe(false);
        });

        it("Should prefix the directory and write the cover sheet into it", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse());

            const directoryName = await cuiFileService.writeDirectoryWithGivenName(writeTree, "classified-export");

            expect(directoryName).toEqual("CUI - classified-export");
            expect(exists(directoryName, "package.json")).toBe(true);
            expect(exists(directoryName, "nodes", "node-1.json")).toBe(true);
            const coverSheet = readFileSync(resolve(process.cwd(), directoryName, CuiFileService.COVER_SHEET_FILE_NAME));
            expect(coverSheet.equals(PDF_BYTES)).toBe(true);
            expect(exists("classified-export")).toBe(false);
        });

        it("Should fail without writing anything when no cover page was returned", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, { teamId: "team-1" });

            await expect(cuiFileService.writeDirectoryWithGivenName(writeTree, "broken-export"))
                .rejects.toThrow("CUI marking applies but the response contained no cover page.");
            expect(exists("broken-export")).toBe(false);
            expect(exists("CUI - broken-export")).toBe(false);
        });
    });
});
