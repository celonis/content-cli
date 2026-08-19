import * as FormData from "form-data";
import { Context } from "../../core/command/cli-context";

export class WorkspaceApi {
    constructor(private readonly context: Context) {}

    public download(packageKey: string): Promise<Buffer> {
        return this.context.httpClient.getFile(
            `/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/file-archive`
        );
    }

    public push(packageKey: string, data: FormData, overwrite: boolean): Promise<unknown> {
        return this.context.httpClient.postFile(
            `/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/file-archive`,
            data,
            { overwrite }
        );
    }
}
