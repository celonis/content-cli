import { PackageMetadataExportTransport } from "../interfaces/package-export.interfaces";
import { FatalError } from "../../../core/utils/logger";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";

export class MetadataApi {

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async exportPackagesMetadata(packageKeys: string[]): Promise<PackageMetadataExportTransport[]> {
        const queryParams = new URLSearchParams();
        packageKeys.forEach(packageKey => queryParams.append("packageKeys", packageKey));

        return this.httpClient().get(`/package-manager/api/core/packages/metadata/export?${queryParams.toString()}`).catch(e => {
            throw new FatalError(`Problem exporting packages metadata: ${e}`);
        })
    }
}
