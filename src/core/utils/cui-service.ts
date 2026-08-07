import { HttpClient } from "../http/http-client";
import { FatalError, logger } from "./logger";
import { Context } from "../command/cli-context";

export interface CuiCategory {
    code: string;
    name: string;
}

export interface ResolvedCuiMarking {
    categories?: CuiCategory[];
}

export interface CuiCoverPage {
    pdfContent: string;
    encoding: string;
}

export interface CuiPdfCoverResponse {
    resolvedCuiMarking?: ResolvedCuiMarking;
    coverPage?: CuiCoverPage;
}

export class CuiService {
    private static readonly COVER_SHEET_URL = "/api/team/cui-settings/cui-pdf-cover";

    private static readonly STATUS_OK = 200;
    private static readonly STATUS_NO_CONTENT = 204;

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    /**
     * Returns null when the team has CUI disabled.
     */
    public async getCuiPdfCover(): Promise<CuiPdfCoverResponse | null> {
        const { status, data } = await this.httpClient().getStatusAndData(CuiService.COVER_SHEET_URL);

        if (status === CuiService.STATUS_NO_CONTENT) {
            logger.debug("CUI marking does not apply, the team has CUI disabled");
            return null;
        }

        if (status !== CuiService.STATUS_OK) {
            const detail = this.describeBody(data) || `Backend responded with status code ${status}`;
            throw new FatalError(`Problem fetching cui: ${detail}`);
        }

        return data ? (data as CuiPdfCoverResponse) : null;
    }

    private describeBody(data: any): string {
        if (!data) {
            return "";
        }
        return `: ${typeof data === "string" ? data : JSON.stringify(data)}`;
    }
}
