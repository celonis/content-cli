// Mock the modules using Jest
import * as fs from "fs";
import { mockAxios } from "./utls/http-requests-mock";
import { TestTransport } from "./utls/test-transport";
import { logger } from "../src/core/utils/logger";

mockAxios();
jest.mock("fs");

const mockWriteFileSync = jest.fn();
(fs.writeFileSync as jest.Mock).mockImplementation(mockWriteFileSync);

const mockWriteSync = jest.fn();
(fs.writeSync as jest.Mock).mockImplementation(mockWriteSync);

afterEach(() => {
    jest.clearAllMocks();
});

let testTransport: TestTransport;

beforeEach(() => {
    jest.clearAllMocks();
    testTransport = new TestTransport({});
    logger.add(testTransport);
});

export {testTransport, mockWriteFileSync, mockWriteSync};