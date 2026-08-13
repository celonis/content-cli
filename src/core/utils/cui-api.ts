import { FatalError, logger } from "./logger";
import { Context } from "../command/cli-context";
import { CuiMarkingCache } from "./cui-marking-cache";

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

    private readonly context: Context;
    private readonly cache: CuiMarkingCache;

    constructor(context: Context) {
        this.context = context;
        this.cache = new CuiMarkingCache(context);
    }

    public getCuiMarking(): Promise<CuiMarkingDecision> {
        if (!this.context.cuiMarking) {
            this.context.cuiMarking = this.resolveCuiMarking().catch(error => {
                this.context.cuiMarking = undefined;
                throw error;
            });
        }

        return this.context.cuiMarking;
    }

    private async resolveCuiMarking(): Promise<CuiMarkingDecision> {
        const cached = this.readCachedMarking();
        if (cached) {
            logger.debug("Reusing the CUI marking decision cached for this session");
            return cached;
        }

        const decision = await this.fetchCuiMarking();
        this.cache.write(decision);

        return decision;
    }

    private readCachedMarking(): CuiMarkingDecision | undefined {
        const cached = this.cache.read() as CuiMarkingDecision | undefined;

        if (cached?.marking === CuiMarking.DISABLED) {
            return cached;
        }
        if (cached?.marking === CuiMarking.CLASSIFIED && cached.cover) {
            return cached;
        }

        if (cached) {
            logger.debug("Ignoring a cached CUI marking decision that cannot be used");
        }

        return undefined;
    }

    private async fetchCuiMarking(): Promise<CuiMarkingDecision> {
        const { status, data } = await this.context.httpClient.getStatusAndData(CuiApi.CUI_PDF_COVER_SHEET_URL);

        if (status === CuiApi.STATUS_FORBIDDEN) {
            logger.debug("CUI marking does not apply, the feature flag is disabled");
            return { marking: CuiMarking.DISABLED };
        }

        if (status === CuiApi.STATUS_OK && data) {
            return { marking: CuiMarking.CLASSIFIED, cover: data as CuiPdfCoverResponse };
        }

        throw new FatalError("Problem fetching cui pdf cover");
    }
}
