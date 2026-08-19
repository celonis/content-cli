import * as FormData from "form-data";
import { Context } from "../../core/command/cli-context";
import { GracefulError } from "../../core/utils/logger";

export class WorkspaceApi {
    constructor(private readonly context: Context) {}

    public async download(packageKey: string): Promise<{ archive: Buffer; eTag: string }> {
        const response = await this.context.httpClient.getFileWithHeaders(
            `/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/file-archive`
        );
        const eTag = response.headers.etag;
        if (typeof eTag !== "string") {
            throw new GracefulError("Filesystem archive response does not contain an ETag.");
        }
        return { archive: response.data, eTag };
    }

    public push(packageKey: string, data: FormData, overwrite: boolean, eTag: string): Promise<unknown> {
        return this.context.httpClient.postFile(
            `/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/file-archive`,
            data,
            { overwrite },
            { "If-Match": eTag }
        );
    }
}
