import { HttpClient } from "../http/http-client";
import { FatalError, logger } from "./logger";
import { Context } from "../command/cli-context";

export const CUI_MARKING_FAILED_MESSAGE = "Could not resolve CUI marking. No file was written";

export interface CuiPdfCoverResponse {
    coverPage?: { pdfContent: string; encoding: string };
}

export enum CuiMarking {
    DISABLED = "DISABLED",
    CLASSIFIED = "CLASSIFIED",
}

export type CuiMarkingDecision =
    | { marking: CuiMarking.DISABLED }
    | { marking: CuiMarking.CLASSIFIED; cover: CuiPdfCoverResponse };

export class CuiApi {
    private static readonly CUI_PDF_COVER_SHEET_URL = "/api/team/cui-settings/cui-pdf-cover";

    private static readonly STATUS_OK = 200;
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

        if (status === CuiApi.STATUS_OK && data) {
            return { marking: CuiMarking.CLASSIFIED, cover: data as CuiPdfCoverResponse };
        }

        logger.debug(`The CUI cover call answered with status ${status}`);
        throw new FatalError(CUI_MARKING_FAILED_MESSAGE);
    }
}
