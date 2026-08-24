import { Context } from "../../core/command/cli-context";
import { GracefulError } from "../../core/utils/logger";
import { NodeFileWriteResponse, WorkspaceBranch, WorkspaceManifest } from "./workspace.models";

export class WorkspaceApi {
    constructor(private readonly context: Context) {}

    public async readFile(packageKey: string, filePath: string): Promise<{ body: Buffer; eTag: string }> {
        const response = await this.context.httpClient.getFileWithHeaders(this.fileUrl(packageKey, filePath));
        const eTag = response.headers.etag;
        if (typeof eTag !== "string") {
            throw new GracefulError(`File response does not contain an ETag: ${filePath}`);
        }
        return { body: response.data, eTag };
    }

    public async manifest(
        packageKey: string,
        ifNoneMatch?: string
    ): Promise<{ manifest?: WorkspaceManifest; eTag: string; notModified: boolean }> {
        const response = await this.context.httpClient.getFileWithHeaders(
            `/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/files`,
            ifNoneMatch ? { "If-None-Match": ifNoneMatch } : {},
            [200, 304]
        );
        const eTag = response.headers.etag;
        if (typeof eTag !== "string" || !eTag) {
            throw new GracefulError("Workspace manifest response does not contain a package ETag.");
        }
        if (response.status === 304) {
            return { eTag, notModified: true };
        }
        try {
            return {
                manifest: JSON.parse(response.data.toString("utf-8")) as WorkspaceManifest,
                eTag,
                notModified: false,
            };
        } catch (error) {
            const failure = new GracefulError("Workspace manifest response is invalid JSON.");
            failure.cause = error;
            throw failure;
        }
    }

    public putFile(
        packageKey: string,
        filePath: string,
        assetType: string,
        body: Buffer,
        contentType: string,
        headers: Record<string, string>
    ): Promise<NodeFileWriteResponse> {
        return this.context.httpClient.putFile(
            `${this.fileUrl(packageKey, filePath)}?assetType=${encodeURIComponent(assetType)}`,
            body,
            contentType,
            undefined,
            headers
        );
    }

    public createFolder(packageKey: string, folderPath: string): Promise<NodeFileWriteResponse> {
        return this.context.httpClient.putFile(
            this.folderUrl(packageKey, folderPath),
            Buffer.alloc(0),
            "application/octet-stream",
            undefined,
            { "If-None-Match": "*" }
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
        return this.pathUrl(packageKey, "files", filePath);
    }

    private folderUrl(packageKey: string, folderPath: string): string {
        return this.pathUrl(packageKey, "folders", folderPath);
    }

    private pathUrl(packageKey: string, collection: string, entryPath: string): string {
        const encodedPath = entryPath
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/");
        return `/pacman/api/core/staging/packages/${encodeURIComponent(packageKey)}/${collection}/${encodedPath}`;
    }
}
