import { HttpClient } from "../http/http-client";
import { FatalError, logger } from "./logger";
import { Context } from "../command/cli-context";

export interface CuiPdfCoverResponse {
    coverPage?: { pdfContent: string; encoding: string };
}

export enum CuiMarking {
    DISABLED = "DISABLED",
    UNCLASSIFIED = "UNCLASSIFIED",
    CLASSIFIED = "CLASSIFIED",
}

export type CuiMarkingDecision =
    | { marking: CuiMarking.DISABLED }
    | { marking: CuiMarking.UNCLASSIFIED }
    | { marking: CuiMarking.CLASSIFIED; cover: CuiPdfCoverResponse };

export class CuiApi {
    private static readonly CUI_PDF_COVER_SHEET_URL = "/api/team/cui-settings/cui-pdf-cover";

    private static readonly STATUS_OK = 200;
    private static readonly STATUS_NO_CONTENT = 204;
    private static readonly STATUS_FORBIDDEN = 403;

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async getCuiMarking(): Promise<CuiMarkingDecision> {
        const { status, data } = await this.httpClient().getStatusAndData(CuiApi.CUI_PDF_COVER_SHEET_URL);

        if (status === CuiApi.STATUS_FORBIDDEN) {
            logger.debug("CUI marking does not apply, the feature flag is disabled");
            return { marking: CuiMarking.DISABLED };
        }

        if (status === CuiApi.STATUS_NO_CONTENT) {
            logger.debug("CUI marking applies, the content is unclassified");
            return { marking: CuiMarking.UNCLASSIFIED };
        }

        if (status === CuiApi.STATUS_OK && data) {
            return { marking: CuiMarking.CLASSIFIED, cover: data as CuiPdfCoverResponse };
        }

        throw new FatalError("Problem fetching cui pdf cover");
    }
}
