// Mock the modules using Jest
import * as fs from "fs";
import {mockAxios} from "./utls/http-requests-mock";
import {LoggingTestTransport} from "./utls/logging-test-transport";
import {logger} from "../src/core/utils/logger";

mockAxios();
jest.mock("fs");

const mockWriteFileSync = jest.fn();
(fs.writeFileSync as jest.Mock).mockImplementation(mockWriteFileSync);

const mockWriteSync = jest.fn();
(fs.writeSync as jest.Mock).mockImplementation(mockWriteSync);

afterEach(() => {
    jest.clearAllMocks();
});

let loggingTestTransport: LoggingTestTransport;

beforeEach(() => {
    jest.clearAllMocks();
    loggingTestTransport = new LoggingTestTransport({});
    logger.add(loggingTestTransport);
});

export {loggingTestTransport, mockWriteFileSync, mockWriteSync};
