import { HttpClient } from "../../core/http/http-client";
import { check, FragmentFile } from "./fragments-inventory";
import { MAX_ARCHIVE_BYTES } from "./fragments-archive";

export interface UploadFile extends FragmentFile {
    fileId: string;
    variantIndex: number;
    uploadPath: string;
}

export interface UploadStatus {
    schemaVersion: 1;
    appId: string;
    uploadId: string;
    releaseId: string;
    version: string;
    files: UploadFile[];
    verifiedFileIds: string[];
    admission: { state: "uploading" | "validating" | "ready" | "rejected" | "expired"; errorCode?: string };
}

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function identifier(value: unknown): value is string {
    return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(value);
}

export class FragmentsApi {
    private readonly base: string;

    constructor(private readonly http: HttpClient, private readonly appId: string) {
        check(identifier(appId), "Invalid projectId: use 1–128 letters, digits, underscores, dots or hyphens, starting with a letter or digit.");
        this.base = `/fragments/apis/v1/apps/${appId}/uploads`;
    }

    public create(files: FragmentFile[], key: string): Promise<UploadStatus> {
        // The API requires a producer version, independently of its generated releaseId.
        return this.request("POST", this.base, {
            schemaVersion: 1, version: `build-${key}`, variants: [{ entryPoint: "index.html", files }],
        }, key);
    }

    public status(uploadId: string): Promise<UploadStatus> {
        return this.request("GET", `${this.base}/${uploadId}`);
    }

    public transfer(upload: UploadStatus, file: UploadFile, bytes: Buffer): Promise<UploadStatus> {
        const path = `${this.base}/${upload.uploadId}/files/${file.fileId}`;
        check(identifier(file.fileId) && file.uploadPath === path, "Gateway returned an unexpected upload path.");
        return this.request("PUT", path, bytes);
    }

    public finalize(uploadId: string): Promise<UploadStatus> {
        return this.request("POST", `${this.base}/${uploadId}/finalize`, { schemaVersion: 1 });
    }

    public transferArchive(uploadId: string, bytes: Buffer): Promise<UploadStatus> {
        return this.request("PUT", `${this.base}/${uploadId}/archive`, bytes, undefined, "application/zip");
    }

    private async request(method: "GET" | "POST" | "PUT", path: string, body?: Buffer | object, key?: string,
        contentType = Buffer.isBuffer(body) ? "application/octet-stream" : "application/json"): Promise<UploadStatus> {
        const response = await this.http.requestRaw(method, path, body, {
            "X-Fragment-Publication": "1",
            "Content-Type": contentType,
            "Accept": "application/json",
            ...(key ? { "Idempotency-Key": key } : {}),
        }, contentType === "application/zip" ? MAX_ARCHIVE_BYTES : undefined);
        const data = response.data;
        if (response.status < 200 || response.status >= 300) {
            const error = record(data) && record(data.error) ? data.error : {};
            const code = identifier(error.code) ? error.code : "UNKNOWN_ERROR";
            const requestId = identifier(error.requestId) ? `; requestId=${error.requestId}` : "";
            throw new Error(`Fragment API HTTP ${response.status}: ${code}${requestId}`);
        }
        check(record(data) && data.schemaVersion === 1 && data.appId === this.appId
            && identifier(data.uploadId) && identifier(data.releaseId) && identifier(data.version)
            && Array.isArray(data.files) && Array.isArray(data.verifiedFileIds)
            && data.verifiedFileIds.every(identifier) && record(data.admission)
            && ["uploading", "validating", "ready", "rejected", "expired"].includes(String(data.admission.state)),
            "Invalid fragment upload response.");
        for (const file of data.files) {
            check(record(file) && identifier(file.fileId) && file.variantIndex === 0
                && typeof file.path === "string" && typeof file.sha256 === "string"
                && typeof file.mediaType === "string" && Number.isSafeInteger(file.size)
                && file.uploadPath === `${this.base}/${data.uploadId}/files/${file.fileId}`,
                "Invalid fragment upload file response.");
        }
        return data as unknown as UploadStatus;
    }
}
