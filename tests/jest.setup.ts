// Mock the modules using Jest
import * as fs from "node:fs";
import { mockAxios } from "./utls/http-requests-mock";
import { LoggingTestTransport } from "./utls/logging-test-transport";
import { logger } from "../src/core/utils/logger";
import { tmpdir } from "os"
import { join } from "path";

import process = require("process");
import { rmTempDir } from "./utls/fs-utils";
import { CuiMarkingCache } from "../src/core/utils/cui-marking-cache";

mockAxios();

// Workers share a parent pid, so each needs its own CUI cache dir to stay independent.
const cuiCacheDir = fs.mkdtempSync(join(tmpdir(), "jest-cui-cache"));
process.env[CuiMarkingCache.CACHE_DIRECTORY_ENV_VARIABLE] = cuiCacheDir;

// Removed wholesale rather than listed, because some specs spy on readdirSync.
afterEach(() => {
    fs.rmSync(cuiCacheDir, { recursive: true, force: true });
});

let tempDir = null;
beforeAll(done => {
    fs.mkdtemp(join(tmpdir(), "jest"), (err, dir) => {
        tempDir = dir;
        done();
    });
});

beforeEach(() => {
    const spy = jest.spyOn(process, "cwd");
    spy.mockReturnValue(tempDir);
});

afterEach(() => {
    jest.clearAllMocks();
});

afterAll(() => {
    jest.restoreAllMocks();
    if (tempDir !== null) {
        logger.info(`Removing tempdir: ${tempDir}`);
        rmTempDir(tempDir);
    }
});

let loggingTestTransport: LoggingTestTransport;

beforeEach(() => {
    jest.clearAllMocks();
    loggingTestTransport = new LoggingTestTransport({});
    logger.add(loggingTestTransport);
});

export {loggingTestTransport};