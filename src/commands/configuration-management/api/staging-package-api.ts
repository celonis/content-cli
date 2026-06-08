import { PackageExportTransport } from "../interfaces/package-export.interfaces";
import { FatalError } from "../../../core/utils/logger";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";

export class StagingPackageApi {

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findAllStagingPackages(flavors: string[], includeBranches: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        queryParams.set("includeBranches", includeBranches.toString());
        flavors.forEach(flavor => queryParams.append("flavors", flavor));

        return this.httpClient().get(`/pacman/api/core/staging/packages/export/list?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem getting staging packages: ${e}`);
        });
    }
}
