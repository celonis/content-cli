import * as AdmZip from "adm-zip";
import { check, FragmentFile, readBuildFile, sha256 } from "./fragments-inventory";

export const MAX_ARCHIVE_BYTES = 66 * 1024 * 1024;

/** Match fragment-cli's auto mode: avoid individual requests for larger inventories. */
export function useArchive(fileCount: number): boolean {
    return fileCount > 10;
}

export async function buildArchive(root: string, files: FragmentFile[]): Promise<Buffer> {
    const zip = new AdmZip();
    for (const file of files) {
        const bytes = await readBuildFile(root, file.path);
        check(bytes.length === file.size && sha256(bytes) === file.sha256,
            `Build changed since inventory: ${file.path}`);
        // The gateway requires variant-prefixed files, without directory entries or metadata.
        zip.addFile(`0/${file.path}`, bytes);
    }
    const archive = zip.toBuffer();
    const total = files.reduce((sum, file) => sum + file.size, 0);
    const limit = Math.min(MAX_ARCHIVE_BYTES, total + Math.ceil(total / 1000) + files.length * 2200 + 22);
    check(archive.length <= limit, "ZIP exceeds the gateway's compressed byte limit.");
    return archive;
}
