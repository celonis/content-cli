import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";

export class SinglePackageExportApi {

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async exportPackage(packageKey: string): Promise<Buffer> {
        return this.httpClient()
            .getFile(`/pacman/api/core/staging/packages/${packageKey}/export-file`)
            .catch(e => {
                throw new FatalError(`Problem exporting package ${packageKey}: ${e}`);
            });
    }
}
