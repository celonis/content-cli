import { HttpClient } from "../http/http-client";
import { FatalError } from "./logger";
import { Context } from "../command/cli-context";

export class CuiService {
    private static readonly BASE_URL = "/teams/cui-settings";
    private static readonly COVER_SHEET_URL = CuiService.BASE_URL + "/cui-pdf-cover";

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async getCuiPdfCover(): Promise<any> {
        return this.httpClient()
            .get(CuiService.COVER_SHEET_URL)
            .catch(e => {
                throw new FatalError(`Problem fetching cui: ${e}`)});
    }
}