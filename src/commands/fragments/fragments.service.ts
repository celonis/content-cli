import { randomUUID } from "crypto";
import { setTimeout as delay } from "timers/promises";
import { Context } from "../../core/command/cli-context";
import { logger } from "../../core/utils/logger";
import { FragmentsApi, identifier, UploadStatus } from "./fragments-api";
import { check, inventoryBuild } from "./fragments-inventory";
import { buildArchive, MAX_ARCHIVE_BYTES } from "./fragments-archive";

export class FragmentsService {
    constructor(private readonly context: Context) {}

    public async upload(projectId: string, directory: string): Promise<UploadStatus> {
        check(identifier(projectId), "Invalid projectId.");
        const { root, files } = await inventoryBuild(directory);
        const profile = this.context.profile;
        check(profile && profile.apiToken, "Select an authenticated profile with --profile.");
        check(!profile.authenticationType || profile.authenticationType === "Bearer",
            "Fragments require a Bearer profile; AppKey authentication is not supported.");
        const origin = new URL(profile.team);
        check(origin.protocol === "https:" && !origin.username && !origin.password
            && origin.pathname === "/" && !origin.search && !origin.hash, "Fragments require an HTTPS tenant origin.");
        const api = new FragmentsApi(this.context.httpClient, projectId);
        const key = randomUUID();
        logger.info(`Uploading ${files.length} files (${files.reduce((sum, file) => sum + file.size, 0)} bytes).`);
        const created = await api.create(files, key);
        logger.info(`Upload ID: ${created.uploadId}`);
        const validate = (upload: UploadStatus): UploadStatus => {
            check(upload.uploadId === created.uploadId && upload.releaseId === created.releaseId
                && upload.version === `build-${key}` && upload.files.length === files.length,
                "Gateway upload identity or inventory changed.");
            const remaining = new Map(files.map(file => [file.path, file]));
            const ids = new Set<string>();
            for (const remote of upload.files) {
                const local = remaining.get(remote.path);
                const original = created.files.find(file => file.path === remote.path);
                check(local && remote.size === local.size && remote.sha256 === local.sha256
                    && remote.mediaType === local.mediaType && !ids.has(remote.fileId)
                    && original && remote.fileId === original.fileId && remote.uploadPath === original.uploadPath,
                    "Gateway returned files outside the declared inventory.");
                remaining.delete(remote.path);
                ids.add(remote.fileId);
            }
            check(upload.verifiedFileIds.every(id => ids.has(id)), "Gateway returned unknown verified file IDs.");
            return upload;
        };
        let upload = validate(created);
        try {
            logger.info("Compressing the build into a ZIP archive.");
            const { archive, limit } = await buildArchive(root, files);
            check(archive.length <= limit, "ZIP exceeds the gateway's compressed byte limit.");
            upload = validate(await api.transferArchive(created.uploadId, archive));
            check(upload.files.every(file => upload.verifiedFileIds.includes(file.fileId)),
                "Gateway did not verify every file in the archive.");
            logger.info(`Uploaded ZIP (${archive.length} bytes).`);
            try {
                upload = validate(await api.finalize(created.uploadId));
            } catch (error) {
                // A lost finalize response may still have committed the release.
                upload = validate(await api.status(created.uploadId));
                if (upload.admission.state === "uploading") { throw error; }
            }
            const deadline = Date.now() + 60000;
            while (upload.admission.state === "validating" && Date.now() < deadline) {
                await delay(1000);
                upload = validate(await api.status(created.uploadId));
            }
            check(upload.admission.state === "ready", `Release admission is ${upload.admission.state}.`
                + (identifier(upload.admission.errorCode) ? ` ${upload.admission.errorCode}` : ""));
            logger.info(`Release ready: appId=${projectId}, uploadId=${upload.uploadId}, releaseId=${upload.releaseId}, version=${upload.version}. Not activated.`);
            return upload;
        } catch (error) {
            const detail = error instanceof Error ? error.message : "Upload failed.";
            throw new Error(`${detail} Inspect /fragments/apis/v1/apps/${projectId}/uploads/${created.uploadId}`);
        }
    }
}
