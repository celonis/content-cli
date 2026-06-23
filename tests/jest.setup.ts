// Mock the modules using Jest
import * as fs from "node:fs";
import { mockAxios } from "./utls/http-requests-mock";
import { LoggingTestTransport } from "./utls/logging-test-transport";
import { logger } from "../src/core/utils/logger";
import { tmpdir } from "os"
import { join } from "path";

import process = require("process");
import { rmTempDir } from "./utls/fs-utils";

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