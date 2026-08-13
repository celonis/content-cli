import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Context } from "../command/cli-context";
import { FileConstants } from "./file.constants";
import { logger } from "./logger";

export class CuiMarkingCache {
    public static readonly CACHE_DIRECTORY_ENV_VARIABLE = "CONTENT_CLI_CUI_CACHE_DIR";

    private static readonly FILE_PREFIX = "content-cli-cui-marking-";

    private readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    public read(): unknown {
        const filePath = this.resolveFilePath();
        if (!filePath || !fs.existsSync(filePath)) {
            return undefined;
        }

        try {
            return JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));
        } catch (error) {
            // The error is interpolated: passing it as metadata makes the logger exit the process.
            logger.debug(`Discarding an unreadable CUI marking cache at ${filePath}: ${error}`);
            this.clear();
            return undefined;
        }
    }

    public write(decision: unknown): void {
        const filePath = this.resolveFilePath();
        if (!filePath) {
            return;
        }

        try {
            fs.mkdirSync(path.dirname(filePath), {
                recursive: true,
                mode: FileConstants.DEFAULT_FOLDER_PERMISSIONS,
            });
            fs.writeFileSync(filePath, JSON.stringify(decision), {
                encoding: "utf-8",
                mode: FileConstants.DEFAULT_FILE_PERMISSIONS,
            });
        } catch (error) {
            logger.debug(`Could not cache the CUI marking decision at ${filePath}: ${error}`);
        }
    }

    public clear(): void {
        const filePath = this.resolveFilePath();
        if (!filePath) {
            return;
        }

        try {
            fs.rmSync(filePath, { force: true });
        } catch (error) {
            logger.debug(`Could not remove the CUI marking cache at ${filePath}: ${error}`);
        }
    }

    private resolveFilePath(): string | undefined {
        const profile = this.context.profile;
        if (!profile?.team) {
            return undefined;
        }

        const key = createHash("sha256").update(`${profile.name}|${profile.team}`).digest("hex").slice(0, 16);
        const directory = process.env[CuiMarkingCache.CACHE_DIRECTORY_ENV_VARIABLE] || os.tmpdir();

        // Tied to the parent shell so a new terminal starts over, and to the temp dir so a reboot clears it.
        return path.join(directory, `${CuiMarkingCache.FILE_PREFIX}${key}-${process.ppid}.json`);
    }
}
