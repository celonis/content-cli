import { createHash } from "crypto";
import { constants } from "fs";
import { lstat, open, readdir } from "fs/promises";
import { extname, join, parse, resolve, sep } from "path";

export interface FragmentFile {
    path: string;
    size: number;
    sha256: string;
    mediaType: string;
}

export const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_RELEASE_BYTES = 64 * 1024 * 1024;
const MEDIA_TYPES: Readonly<Record<string, string>> = {
    ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
    ".css": "text/css", ".json": "application/json", ".map": "application/json",
    ".wasm": "application/wasm", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
    ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif",
    ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".txt": "text/plain",
};
const RESERVED = new Set(["fragment-artifact.json", "fragment-release.json", "fragment-deployment.json"]);

export function check(value: unknown, message: string): asserts value {
    if (!value) { throw new Error(message); }
}

export function sha256(bytes: Buffer): string {
    return createHash("sha256").update(bytes).digest("hex");
}

async function rejectSymlinks(filePath: string): Promise<void> {
    const absolute = resolve(filePath);
    let current = parse(absolute).root;
    for (const part of absolute.slice(current.length).split(sep).filter(Boolean)) {
        current = join(current, part);
        check(!(await lstat(current)).isSymbolicLink(), "Build paths must not contain symlinks.");
    }
}

/** Bound reads even if a file grows between stat and read. */
export async function readBuildFile(root: string, path: string): Promise<Buffer> {
    const absolute = join(root, path);
    await rejectSymlinks(absolute);
    const file = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
        const stat = await file.stat();
        check(stat.isFile() && stat.size <= MAX_FILE_BYTES, `Invalid or oversized build file: ${path}`);
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of file.createReadStream({ autoClose: false, highWaterMark: 65536 })) {
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += bytes.length;
            check(size <= MAX_FILE_BYTES, `Build file exceeds 16 MiB: ${path}`);
            chunks.push(bytes);
        }
        return Buffer.concat(chunks);
    } finally {
        await file.close();
    }
}

export async function inventoryBuild(directory: string): Promise<{ root: string; files: FragmentFile[] }> {
    const root = resolve(directory);
    await rejectSymlinks(root);
    check((await lstat(root)).isDirectory(), "Build root must be a directory.");
    // Check the fixed entry point before any network request or directory traversal.
    try {
        await readBuildFile(root, "index.html");
    } catch {
        throw new Error("The build directory must contain a regular, non-symlink index.html (at most 16 MiB).");
    }
    const files: FragmentFile[] = [];
    const paths = new Set<string>();
    let total = 0;
    let examined = 0;
    const walk = async (prefix: string): Promise<void> => {
        const entries = await readdir(join(root, prefix), { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            const path = prefix + entry.name;
            check(++examined <= 1000, "Build exceeds the directory traversal limit.");
            check(path.length <= 1024 && /^[a-zA-Z0-9_@][a-zA-Z0-9_.@-]*$/.test(entry.name)
                && !RESERVED.has(entry.name), `Invalid or reserved build path: ${path}`);
            check(!entry.isSymbolicLink(), `Build contains a symlink: ${path}`);
            check(!paths.has(path.toLowerCase()), `Case-insensitive duplicate build path: ${path}`);
            paths.add(path.toLowerCase());
            if (entry.isDirectory()) {
                await walk(path + "/");
            } else {
                check(entry.isFile(), `Unsupported filesystem entry: ${path}`);
                check(files.length < 500, "Build exceeds 500 files.");
                const mediaType = MEDIA_TYPES[extname(path)];
                check(mediaType, `Unsupported build file extension: ${path}`);
                const bytes = await readBuildFile(root, path);
                total += bytes.length;
                check(total <= MAX_RELEASE_BYTES, "Build exceeds 64 MiB.");
                files.push({ path, size: bytes.length, sha256: sha256(bytes), mediaType });
            }
        }
    };
    await walk("");
    return { root, files };
}
