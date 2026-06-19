// Mock the modules using Jest
import * as fs from "node:fs";
import { mockAxios } from "./utls/http-requests-mock";
import { LoggingTestTransport } from "./utls/logging-test-transport";
import { logger } from "../src/core/utils/logger";
import { tmpdir } from "os"
import { join } from "path";

import process = require("process");

mockAxios();

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
    if (tempDir !== null) {
        logger.info(`Removing tempdir: ${tempDir}`);
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
            logger.warn(`Could not delete tempdir: ${tempDir}`, e);
        }
    }
});

let loggingTestTransport: LoggingTestTransport;

beforeEach(() => {
    jest.clearAllMocks();
    loggingTestTransport = new LoggingTestTransport({});
    logger.add(loggingTestTransport);
});

export {loggingTestTransport};