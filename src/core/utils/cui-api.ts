import { HttpClient } from "../http/http-client";
import { FatalError, logger } from "./logger";
import { Context } from "../command/cli-context";

export interface CuiPdfCoverResponse {
    resolvedCuiMarking?: { categories?: unknown[] };
    coverPage?: { pdfContent: string; encoding: string };
}

export class CuiApi {
    private static readonly CUI_PDF_COVER_SHEET_URL = "/api/team/cui-settings/cui-pdf-cover";

    private static readonly STATUS_OK = 200;
    private static readonly STATUS_NO_CONTENT = 204;
    private static readonly STATUS_FORBIDDEN = 403;

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async getCuiPdfCover(): Promise<CuiPdfCoverResponse | null> {
        const { status, data } = await this.httpClient().getStatusAndData(CuiApi.CUI_PDF_COVER_SHEET_URL);

        if (status === CuiApi.STATUS_FORBIDDEN) {
            logger.debug("CUI marking does not apply, the feature flag is disabled");
            return null;
        }

        if (status === CuiApi.STATUS_NO_CONTENT) {
            logger.debug("CUI marking does not apply, the team has CUI disabled");
            return null;
        }

        if (status === CuiApi.STATUS_OK && data) {
            return data as CuiPdfCoverResponse;
        }

        throw new FatalError("Problem fetching cui pdf cover");
    }
}
