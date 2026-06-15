// Mock the modules using Jest
import * as fs from "fs";
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
        const spy = jest.spyOn(process, "cwd");
        spy.mockReturnValue(dir);
        tempDir = dir;
        done();
    });
});

afterEach(() => {
    jest.clearAllMocks();
});

afterAll(() => {
    if (tempDir !== null) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

let loggingTestTransport: LoggingTestTransport;

beforeEach(() => {
    jest.clearAllMocks();
    loggingTestTransport = new LoggingTestTransport({});
    logger.add(loggingTestTransport);
});

export {loggingTestTransport};