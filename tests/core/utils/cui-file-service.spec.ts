import { accessSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import AdmZip = require("adm-zip");
import { CuiFileService } from "../../../src/core/utils/cui-file-service";
import { FatalError } from "../../../src/core/utils/logger";
import { testContext } from "../../utls/test-context";
import { mockAxiosGetError, mockAxiosGetWithStatus } from "../../utls/http-requests-mock";

describe("CuiFileService", () => {
    const COVER_URL = "https://myTeam.celonis.cloud/api/team/cui-settings/cui-pdf-cover";
    const PDF_BYTES = Buffer.from("%PDF-1.4 cover sheet");
    const PAYLOAD = JSON.stringify({ key: "pkg-1" });

    let cuiFileService: CuiFileService;

    const coverResponse = (categories: Array<{ code: string; name: string }>) => ({
        resolvedCuiMarking: { categories },
        coverPage: {
            pdfContent: PDF_BYTES.toString("base64"),
            encoding: "base64",
        },
    });

    const readFile = (filename: string): Buffer => readFileSync(resolve(process.cwd(), filename));

    beforeEach(() => {
        cuiFileService = new CuiFileService(testContext);
    });

    describe("when CUI marking does not apply", () => {
        it("Should keep the original filename when the feature is not enabled for the team", async () => {
            mockAxiosGetError(COVER_URL, 403, { errorCode: "feature-disabled" });

            const filename = await cuiFileService.writeToFileWithGivenName(PAYLOAD, "report.json");

            expect(filename).toEqual("report.json");
            expect(readFile("report.json").toString()).toEqual(PAYLOAD);
        });

        it("Should keep the original filename when the team has CUI disabled", async () => {
            mockAxiosGetWithStatus(COVER_URL, 204, "");

            const filename = await cuiFileService.writeToFileWithGivenName(PAYLOAD, "no-marking.json");

            expect(filename).toEqual("no-marking.json");
            expect(readFile("no-marking.json").toString()).toEqual(PAYLOAD);
        });

        it("Should fail on an unexpected backend error", async () => {
            mockAxiosGetError(COVER_URL, 500, { message: "boom" });

            await expect(cuiFileService.writeToFileWithGivenName(PAYLOAD, "broken.json")).rejects.toThrow(FatalError);
            expect(() => accessSync(resolve(process.cwd(), "broken.json"))).toThrow();
        });
    });

    describe("when the content is unclassified", () => {
        it("Should only prefix the filename and write no cover sheet", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse([]));

            const filename = await cuiFileService.writeToFileWithGivenName(PAYLOAD, "packages.json");

            expect(filename).toEqual("Unclassified - packages.json");
            expect(readFile(filename).toString()).toEqual(PAYLOAD);
            expect(() => accessSync(resolve(process.cwd(), CuiFileService.COVER_SHEET_FILE_NAME))).toThrow();
        });
    });

    describe("when the content is classified", () => {
        it("Should wrap the payload and the decoded cover sheet into a CUI archive", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, coverResponse([{ code: "PRVCY", name: "Privacy" }]));

            const filename = await cuiFileService.writeToFileWithGivenName(PAYLOAD, "packages.json");

            expect(filename).toEqual("CUI - packages.zip");

            const zip = new AdmZip(readFile(filename));
            expect(zip.getEntries().map(entry => entry.entryName).sort())
                .toEqual([CuiFileService.COVER_SHEET_FILE_NAME, "packages.json"]);
            expect(zip.getEntry("packages.json").getData().toString()).toEqual(PAYLOAD);
            expect(zip.getEntry(CuiFileService.COVER_SHEET_FILE_NAME).getData().equals(PDF_BYTES)).toBe(true);
        });

        it("Should fail when the cover page uses an unsupported encoding", async () => {
            const response = coverResponse([{ code: "PRVCY", name: "Privacy" }]);
            response.coverPage.encoding = "hex";
            mockAxiosGetWithStatus(COVER_URL, 200, response);

            await expect(cuiFileService.writeToFileWithGivenName(PAYLOAD, "packages.json"))
                .rejects.toThrow("Unsupported CUI cover page encoding: hex");
        });

        it("Should fail when the marking applies but no cover page was returned", async () => {
            mockAxiosGetWithStatus(COVER_URL, 200, {
                resolvedCuiMarking: { categories: [{ code: "PRVCY", name: "Privacy" }] },
            });

            await expect(cuiFileService.writeToFileWithGivenName(PAYLOAD, "packages.json"))
                .rejects.toThrow("CUI marking applies but the response contained no cover page.");
        });
    });
});
