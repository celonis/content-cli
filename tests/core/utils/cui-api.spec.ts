import { CUI_MARKING_FAILED_MESSAGE, CuiApi, CuiMarking } from "../../../src/core/utils/cui-api";
import { FatalError } from "../../../src/core/utils/logger";
import { testContext } from "../../utls/test-context";
import { mockAxiosGetWithStatus } from "../../utls/http-requests-mock";

describe("CuiApi", () => {
    const COVER_URL = "https://myTeam.celonis.cloud/api/team/cui-settings/cui-pdf-cover";

    const coverResponse = () => ({
        coverPage: {
            pdfContent: Buffer.from("%PDF-1.4 cover sheet").toString("base64"),
            encoding: "base64",
        },
    });

    let cuiApi: CuiApi;

    beforeEach(() => {
        cuiApi = new CuiApi(testContext);
    });

    it("Should report the content as classified and pass the cover response on", async () => {
        const cover = coverResponse();
        mockAxiosGetWithStatus(COVER_URL, 200, cover);

        await expect(cuiApi.getCuiMarking()).resolves.toEqual({
            marking: CuiMarking.CLASSIFIED,
            cover,
        });
    });

    it("Should report that marking does not apply when the feature flag is disabled", async () => {
        mockAxiosGetWithStatus(COVER_URL, 403, "");

        await expect(cuiApi.getCuiMarking()).resolves.toEqual({ marking: CuiMarking.DISABLED });
    });

    it("Should fail when the marking applies but the response body is empty", async () => {
        mockAxiosGetWithStatus(COVER_URL, 200, "");

        await expect(cuiApi.getCuiMarking()).rejects.toThrow(FatalError);
        await expect(cuiApi.getCuiMarking()).rejects.toThrow(CUI_MARKING_FAILED_MESSAGE);
    });

    it("Should fail when the backend answers with an unexpected status", async () => {
        mockAxiosGetWithStatus(COVER_URL, 204, "");

        await expect(cuiApi.getCuiMarking()).rejects.toThrow(CUI_MARKING_FAILED_MESSAGE);
    });
});
