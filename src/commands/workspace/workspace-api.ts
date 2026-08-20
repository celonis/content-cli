import * as FormData from "form-data";
import { Context } from "../../core/command/cli-context";
import { GracefulError } from "../../core/utils/logger";
import { NodeFileWriteResponse, WorkspaceBranch } from "./workspace.models";

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

    public pushArchive(packageKey: string, data: FormData, overwrite: boolean, eTag: string): Promise<unknown> {
        return this.context.httpClient.postFile(
            `/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/file-archive`,
            data,
            { overwrite },
            { "If-Match": eTag }
        );
    }

    public async readFile(packageKey: string, filePath: string): Promise<{ body: Buffer; eTag: string }> {
        const response = await this.context.httpClient.getFileWithHeaders(this.fileUrl(packageKey, filePath));
        const eTag = response.headers.etag;
        if (typeof eTag !== "string") {
            throw new GracefulError(`File response does not contain an ETag: ${filePath}`);
        }
        return { body: response.data, eTag };
    }

    public putFile(
        packageKey: string,
        filePath: string,
        body: Buffer,
        contentType: string,
        headers: Record<string, string>
    ): Promise<NodeFileWriteResponse> {
        return this.context.httpClient.putFile(
            this.fileUrl(packageKey, filePath),
            body,
            contentType,
            undefined,
            headers
        );
    }

    public moveFile(
        packageKey: string,
        sourcePath: string,
        targetPath: string,
        eTag: string
    ): Promise<NodeFileWriteResponse> {
        return this.context.httpClient.patch(
            this.fileUrl(packageKey, sourcePath),
            { targetPath },
            { "If-Match": eTag }
        );
    }

    public deleteFile(packageKey: string, filePath: string, eTag: string): Promise<void> {
        return this.context.httpClient.delete(this.fileUrl(packageKey, filePath), { "If-Match": eTag });
    }

    public createBranch(packageKey: string, branchKey: string): Promise<WorkspaceBranch> {
        return this.context.httpClient.post(`/pacman/api/core/packages/${encodeURIComponent(packageKey)}/branches`, {
            branchKey,
            version: "STAGING",
        });
    }

    private fileUrl(packageKey: string, filePath: string): string {
        const encodedPath = filePath
            .split("/")
            .map(segment => encodeURIComponent(segment))
            .join("/");
        return `/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/files/${encodedPath}`;
    }
}
