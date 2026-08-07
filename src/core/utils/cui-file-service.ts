import { Context } from "../command/cli-context";
import { CuiService } from "./cui-service";

export class CuiFileService {

    private readonly cuiService: CuiService;

    constructor(context: Context) {
        this.cuiService = new CuiService(context);
    }

    public async writeToFileWithGivenName(data: any, filename: string): Promise<string> {
        const cuiPdfCover = await this.cuiService.getCuiPdfCover();
        // TODO CUI logic here
        return filename;
    }
}