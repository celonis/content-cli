import * as FormData from "form-data";
import { Context } from "../../core/command/cli-context";

export class WorkspaceApi {
    constructor(private readonly context: Context) {}

    public checkout(packageKey: string): Promise<Buffer> {
        return this.context.httpClient.getFile(
            `/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/file-archive`
        );
    }

    public push(data: FormData, overwrite: boolean): Promise<unknown> {
        return this.context.httpClient.postFile("/pacman/api/core/staging/packages/file-archive", data, { overwrite });
    }
}
