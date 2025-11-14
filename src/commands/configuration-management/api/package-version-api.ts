import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";
import { PackageVersionTransport } from "../interfaces/package-version.interfaces";

export class PackageVersionApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findOne(packageKey: string, version: string): Promise<PackageVersionTransport> {
        return this.httpClient()
            .get(`/pacman/api/core/packages/${packageKey}/version/${version}`)
            .catch(e => {
                throw new FatalError(`Problem finding Package with key '${packageKey}' and version '${version}': ${e}`);
            });
    }
}

