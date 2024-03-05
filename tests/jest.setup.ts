import * as fs from 'fs';
import {setDefaultProfile} from "./utls/context-mock";
import {TestTransport} from "./utls/test-transport";
import {logger} from "../src/util/logger";

// Mock the modules using Jest
jest.mock('axios');
jest.mock('fs');

const mockWriteFileSync = jest.fn();
(fs.writeFileSync as jest.Mock).mockImplementation(mockWriteFileSync);

const mockWriteSync = jest.fn();
(fs.writeSync as jest.Mock).mockImplementation(mockWriteSync);

afterEach(() => {
    jest.clearAllMocks();
})

beforeAll(() => {
    setDefaultProfile();
})

let testTransport;

beforeEach(() => {
    jest.clearAllMocks();
    testTransport = new TestTransport({})
    logger.add(testTransport);
})

export {testTransport, mockWriteFileSync, mockWriteSync};